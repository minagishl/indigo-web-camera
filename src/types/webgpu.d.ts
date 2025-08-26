/**
 * Minimal ambient WebGPU type shims for environments / TS versions
 * where official lib.dom.d.ts does not yet expose them.
 * If the compiler already has real definitions, this file is ignored
 * (duplicate interface merging is benign provided members match).
 *
 * NOTE: This is a reduced surface only for what the project currently uses.
 * For production-quality typing remove this shim after upgrading TypeScript
 * to a version with stable WebGPU definitions.
 */

declare global {
  interface Navigator {
    gpu?: GPU;
  }

  interface GPU {
    requestAdapter(): Promise<GPUAdapter | null>;
  }

  interface GPUAdapter {
    requestDevice(): Promise<GPUDevice>;
  }

  interface GPUDevice {
    createShaderModule(desc: { code: string }): GPUShaderModule;
    createComputePipeline(desc: {
      layout?: "auto";
      compute: { module: GPUShaderModule; entryPoint: string };
    }): GPUComputePipeline;
    createSampler(desc?: any): GPUSampler;
    createTexture(desc: any): GPUTexture;
    createBuffer(desc: any): GPUBuffer;
    createCommandEncoder(): GPUCommandEncoder;
    /**
     * Minimal bind group creation (layout + entries with binding/resource).
     * resource は view / sampler / { buffer } など任意 any 扱い簡易型。
     */
    createBindGroup(desc: {
      layout: GPUBindGroupLayout;
      entries: { binding: number; resource: any }[];
    }): GPUBindGroup;
    queue: GPUQueue;
  }

  interface GPUQueue {
    submit(cmds: GPUCommandBuffer[]): void;
    writeBuffer(buffer: GPUBuffer, offset: number, data: BufferSource): void;
    copyExternalImageToTexture(
      source: {
        source: CanvasImageSource | ImageBitmap | VideoFrame | HTMLVideoElement;
      },
      destination: { texture: GPUTexture },
      copySize: { width: number; height: number }
    ): void;
  }

  interface GPUShaderModule {}
  interface GPUComputePipeline {
    getBindGroupLayout(index: number): GPUBindGroupLayout;
  }
  interface GPUBindGroupLayout {}
  interface GPUBindGroup {}
  interface GPUSampler {}
  interface GPUTexture {
    createView(): any;
  }
  interface GPUBuffer {
    mapAsync(mode: number): Promise<void>;
    getMappedRange(): ArrayBuffer;
    unmap(): void;
  }
  interface GPUCommandEncoder {
    beginComputePass(): GPUComputePassEncoder;
    copyTextureToBuffer(
      source: { texture: GPUTexture },
      destination: {
        buffer: GPUBuffer;
        bytesPerRow: number;
        rowsPerImage: number;
      },
      size: { width: number; height: number; depthOrArrayLayers: number }
    ): void;
    finish(): GPUCommandBuffer;
  }
  interface GPUComputePassEncoder {
    setPipeline(p: GPUComputePipeline): void;
    setBindGroup(index: number, bg: GPUBindGroup): void;
    dispatchWorkgroups(x: number, y?: number, z?: number): void;
    end(): void;
  }
  interface GPUCommandBuffer {}

  // Usage / mode flag objects (simple numeric bitfields)
  const GPUTextureUsage: {
    readonly COPY_SRC: number;
    readonly COPY_DST: number;
    readonly TEXTURE_BINDING: number;
    readonly STORAGE: number;
  };

  const GPUBufferUsage: {
    readonly MAP_READ: number;
    readonly COPY_DST: number;
    readonly UNIFORM: number;
  };

  const GPUMapMode: {
    readonly READ: number;
  };

  type GPUTextureFormat = string;
}

export {};
