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
    @group(0) @binding(2) var<uniform> uInfo: vec2<f32>; // (frameCount, gammaInv)

    fn toneMapReinhard(c: f32) -> f32 {
      return c / (1.0 + c);
    }

    @compute @workgroup_size(8,8)
    fn main(@builtin(global_invocation_id) gid: vec3<u32>) {
      let dims = textureDimensions(accumTex);
      if (gid.x >= dims.x || gid.y >= dims.y) { return; }

      let sum = textureLoad(accumTex, vec2<i32>(gid.xy), 0);
      let fc = max(uInfo.x, 1.0);
      var avg = sum.rgb / fc;

      // tone map
      avg = vec3<f32>(toneMapReinhard(avg.r), toneMapReinhard(avg.g), toneMapReinhard(avg.b));

      // gamma encode (approx)
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
  opts?: { tone?: "reinhard"; maxFrames?: number }
): Promise<ImageData> {
  if (!navigator.gpu) {
    throw new Error("WebGPU not supported");
  }

  const frameCount = Math.min(frames, opts?.maxFrames ?? MAX_FRAMES);
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (!w || !h) throw new Error("Video not ready");

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
    size: { width: w, height: h },
    format: "rgba8unorm",
    usage: outUsage | GPUTextureUsage.COPY_SRC,
  });

  const frameUniformBuffer = device.createBuffer({
    size: 4, // u32
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });

  const toneUniformBuffer = device.createBuffer({
    size: 8, // 2 * f32
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
    new Float32Array([frameCount, 1 / 2.2])
  );

  {
    const commandEncoder = encoder();
    const toneBindGroup = device.createBindGroup({
      layout: pipelines.toneMapPipe.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: accumA.createView() }, // final accumulation
        { binding: 1, resource: outputTex.createView() },
        { binding: 2, resource: { buffer: toneUniformBuffer } },
      ],
    });
    const pass = commandEncoder.beginComputePass();
    pass.setPipeline(pipelines.toneMapPipe);
    pass.setBindGroup(0, toneBindGroup);
    pass.dispatchWorkgroups(Math.ceil(w / 8), Math.ceil(h / 8));
    pass.end();
    device.queue.submit([commandEncoder.finish()]);
  }

  // Readback
  const bytesPerPixel = 4; // rgba8
  const paddedBytesPerRow = Math.ceil((w * bytesPerPixel) / 256) * 256;
  const bufferSize = paddedBytesPerRow * h;

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
        rowsPerImage: h,
      },
      { width: w, height: h, depthOrArrayLayers: 1 }
    );
    device.queue.submit([commandEncoder.finish()]);
  }

  await readBuffer.mapAsync(GPUMapMode.READ);
  const copy = readBuffer.getMappedRange();
  const data = new Uint8ClampedArray(w * h * 4);

  // Remove row padding
  let dstOffset = 0;
  for (let row = 0; row < h; row++) {
    const src = new Uint8Array(
      copy,
      row * paddedBytesPerRow,
      w * bytesPerPixel
    );
    data.set(src, dstOffset);
    dstOffset += w * bytesPerPixel;
  }
  readBuffer.unmap();

  return new ImageData(data, w, h);
}
