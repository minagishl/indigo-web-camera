/**
 * WebGPU HDR: accumulate linearized frames (fp16), tone map (Reinhard), gamma encode, output 8-bit. Fallback handled by caller. Minimal; no motion alignment/rejection.
 */

const MAX_FRAMES = 64;

interface HDRPipelines {
  accumulatePipe: GPUComputePipeline;
  toneMapPipe: GPUComputePipeline;
  sampler: GPUSampler;
  linearBindGroupLayout: GPUBindGroupLayout;
}

let cachedDevice: GPUDevice | null = null;
let cachedPipelines: HDRPipelines | null = null;

async function getDevice(): Promise<GPUDevice> {
  if (cachedDevice) return cachedDevice;
  const gpu = navigator.gpu;
  if (!gpu) throw new Error("WebGPU not supported");
  const adapter = await gpu.requestAdapter();
  if (!adapter) throw new Error("WebGPU adapter unavailable");
  cachedDevice = await adapter.requestDevice();
  return cachedDevice;
}

function createPipelines(device: GPUDevice): HDRPipelines {
  if (cachedPipelines) return cachedPipelines;

  const accumulateWGSL = /* wgsl */ `
    @group(0) @binding(0) var inputTex: texture_2d<f32>;
    @group(0) @binding(1) var prevAccum: texture_storage_2d<rgba16float, read>;
    @group(0) @binding(2) var nextAccum: texture_storage_2d<rgba16float, write>;
    @group(0) @binding(3) var<uniform> uFrame: u32;

    fn srgbToLinear(c: f32) -> f32 {
      // approx gamma 2.2
      return pow(c, 2.2);
    }

    @compute @workgroup_size(8,8)
    fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
      let dims = textureDimensions(inputTex);
      if (gid.x >= dims.x || gid.y >= dims.y) { return; }

      let src = textureLoad(inputTex, vec2<i32>(gid.xy), 0);
      let lin = vec4<f32>(
        srgbToLinear(src.r),
        srgbToLinear(src.g),
        srgbToLinear(src.b),
        1.0
      );

      var accumOld = vec4<f32>(0.0);
      if (uFrame > 0u) {
        accumOld = textureLoad(prevAccum, vec2<i32>(gid.xy), 0);
      }

      let accumNew = accumOld + lin;
      textureStore(nextAccum, vec2<i32>(gid.xy), accumNew);
    }
  `;

  const toneMapWGSL = /* wgsl */ `
    @group(0) @binding(0) var accumTex: texture_storage_2d<rgba16float, read>;
    @group(0) @binding(1) var outTex: texture_storage_2d<rgba8unorm, write>;
    @group(0) @binding(2) var<uniform> uInfo: vec4<f32>; // frameCount, gammaInv, srcW, srcH
    @group(0) @binding(3) var<uniform> uRot: u32;        // 0,1,2,3 (0,90,180,270)

    fn toneMapReinhard(c: f32) -> f32 {
      return c / (1.0 + c);
    }

    @compute @workgroup_size(8,8)
    fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
      let outDims = textureDimensions(outTex);
      if (gid.x >= outDims.x || gid.y >= outDims.y) { return; }

      let srcW = i32(uInfo.z);
      let srcH = i32(uInfo.w);
      let x = i32(gid.x);
      let y = i32(gid.y);
      var sx = x;
      var sy = y;
      switch uRot {
        case 1u: { // 90 cw
          sx = y;
          sy = srcH - 1 - x;
        }
        case 2u: { // 180
          sx = srcW - 1 - x;
          sy = srcH - 1 - y;
        }
        case 3u: { // 270 cw
          sx = srcW - 1 - y;
          sy = x;
        }
        default: {}
      }
      if (sx < 0 || sy < 0 || sx >= srcW || sy >= srcH) { return; }

      let sum = textureLoad(accumTex, vec2<i32>(sx, sy), 0);
      let fc = max(uInfo.x, 1.0);
      var avg = sum.rgb / fc;
      avg = vec3<f32>(toneMapReinhard(avg.r), toneMapReinhard(avg.g), toneMapReinhard(avg.b));
      let gammaInv = uInfo.y;
      avg = pow(avg, vec3<f32>(gammaInv));
      textureStore(outTex, vec2<i32>(gid.xy), vec4<f32>(avg, 1.0));
    }
  `;

  const accumulationModule = device.createShaderModule({
    code: accumulateWGSL,
  });
  const toneMapModule = device.createShaderModule({ code: toneMapWGSL });

  const accumulatePipe = device.createComputePipeline({
    layout: "auto",
    compute: { module: accumulationModule, entryPoint: "main" },
  });

  const toneMapPipe = device.createComputePipeline({
    layout: "auto",
    compute: { module: toneMapModule, entryPoint: "main" },
  });

  const sampler = device.createSampler({
    magFilter: "linear",
    minFilter: "linear",
  });

  cachedPipelines = {
    accumulatePipe,
    toneMapPipe,
    sampler,
    linearBindGroupLayout: accumulatePipe.getBindGroupLayout(0),
  };
  return cachedPipelines;
}

/**
 * Main HDR accumulation
 */
export async function webgpuAccumulateHDR(
  video: HTMLVideoElement,
  frames: number,
  opts?: { tone?: "reinhard"; maxFrames?: number; orientation?: number }
): Promise<ImageData> {
  if (!navigator.gpu) {
    throw new Error("WebGPU not supported");
  }

  const frameCount = Math.min(frames, opts?.maxFrames ?? MAX_FRAMES);
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) throw new Error("Video not ready");
  const orientation = ((opts?.orientation || 0) + 360) % 360;
  const rotQuarter =
    orientation === 90
      ? 1
      : orientation === 180
      ? 2
      : orientation === 270
      ? 3
      : 0;
  const outW = rotQuarter % 2 === 1 ? h : w;
  const outH = rotQuarter % 2 === 1 ? w : h;

  const device = await getDevice();
  const pipelines = createPipelines(device);

  // Recreate textures if dimension changed (simple policy)
  const accumUsage =
    GPUTextureUsage.STORAGE |
    GPUTextureUsage.COPY_SRC |
    GPUTextureUsage.TEXTURE_BINDING;
  const tempUsage = GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING;
  const outUsage = GPUTextureUsage.STORAGE | GPUTextureUsage.COPY_SRC;

  const makeAccumTex = () =>
    device.createTexture({
      size: { width: w, height: h },
      format: "rgba16float",
      usage: accumUsage,
    });

  let accumA = makeAccumTex();
  let accumB = makeAccumTex();
  let inputTex = device.createTexture({
    size: { width: w, height: h },
    format: "rgba8unorm",
    usage: tempUsage,
  });
  let outputTex = device.createTexture({
    size: { width: outW, height: outH },
    format: "rgba8unorm",
    usage: outUsage | GPUTextureUsage.COPY_SRC,
  });

  const frameUniformBuffer = device.createBuffer({
    size: 4, // u32
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const toneUniformBuffer = device.createBuffer({
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const rotUniformBuffer = device.createBuffer({
    size: 4,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  // Helper to encode a pass command
  const encoder = () => device.createCommandEncoder();

  for (let f = 0; f < frameCount; f++) {
    // Copy video frame into inputTex
    device.queue.copyExternalImageToTexture(
      { source: video },
      { texture: inputTex },
      { width: w, height: h }
    );

    device.queue.writeBuffer(frameUniformBuffer, 0, new Uint32Array([f]));

    const commandEncoder = encoder();

    // Bindings for accumulation pass
    const bindGroup = device.createBindGroup({
      layout: pipelines.accumulatePipe.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: inputTex.createView() },
        { binding: 1, resource: accumA.createView() }, // previous (unused when f==0)
        { binding: 2, resource: accumB.createView() }, // next
        { binding: 3, resource: { buffer: frameUniformBuffer } },
      ],
    });

    {
      const pass = commandEncoder.beginComputePass();
      pass.setPipeline(pipelines.accumulatePipe);
      pass.setBindGroup(0, bindGroup);
      pass.dispatchWorkgroups(Math.ceil(w / 8), Math.ceil(h / 8));
      pass.end();
    }

    // Submit
    device.queue.submit([commandEncoder.finish()]);

    // Ping-pong
    [accumA, accumB] = [accumB, accumA];
  }

  // Tone map pass
  device.queue.writeBuffer(
    toneUniformBuffer,
    0,
    new Float32Array([frameCount, 1 / 2.2, w, h])
  );
  device.queue.writeBuffer(rotUniformBuffer, 0, new Uint32Array([rotQuarter]));

  {
    const commandEncoder = encoder();
    const toneBindGroup = device.createBindGroup({
      layout: pipelines.toneMapPipe.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: accumA.createView() },
        { binding: 1, resource: outputTex.createView() },
        { binding: 2, resource: { buffer: toneUniformBuffer } },
        { binding: 3, resource: { buffer: rotUniformBuffer } },
      ],
    });
    const pass = commandEncoder.beginComputePass();
    pass.setPipeline(pipelines.toneMapPipe);
    pass.setBindGroup(0, toneBindGroup);
    pass.dispatchWorkgroups(Math.ceil(outW / 8), Math.ceil(outH / 8));
    pass.end();
    device.queue.submit([commandEncoder.finish()]);
  }

  // Readback
  const bytesPerPixel = 4;
  const paddedBytesPerRow = Math.ceil((outW * bytesPerPixel) / 256) * 256;
  const bufferSize = paddedBytesPerRow * outH;

  const readBuffer = device.createBuffer({
    size: bufferSize,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });

  {
    const commandEncoder = device.createCommandEncoder();
    commandEncoder.copyTextureToBuffer(
      { texture: outputTex },
      {
        buffer: readBuffer,
        bytesPerRow: paddedBytesPerRow,
        rowsPerImage: outH,
      },
      { width: outW, height: outH, depthOrArrayLayers: 1 }
    );
    device.queue.submit([commandEncoder.finish()]);
  }

  await readBuffer.mapAsync(GPUMapMode.READ);
  const copy = readBuffer.getMappedRange();
  const data = new Uint8ClampedArray(outW * outH * 4);

  // Remove row padding
  let dstOffset = 0;
  for (let row = 0; row < outH; row++) {
    const src = new Uint8Array(
      copy,
      row * paddedBytesPerRow,
      outW * bytesPerPixel
    );
    data.set(src, dstOffset);
    dstOffset += outW * bytesPerPixel;
  }
  readBuffer.unmap();

  return new ImageData(data, outW, outH);
}
