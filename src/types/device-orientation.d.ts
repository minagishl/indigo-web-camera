/**
 * Type definitions for device orientation
 */

declare global {
  interface Screen {
    orientation?: ScreenOrientation;
  }

  interface ScreenOrientation {
    type: OrientationType;
    angle: number;
    onchange: ((this: ScreenOrientation, ev: Event) => any) | null;
    addEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | AddEventListenerOptions
    ): void;
    removeEventListener(
      type: string,
      listener: EventListenerOrEventListenerObject,
      options?: boolean | EventListenerOptions
    ): void;
  }

  type OrientationType =
    | "portrait-primary"
    | "portrait-secondary"
    | "landscape-primary"
    | "landscape-secondary";

  interface DeviceOrientationEvent extends Event {
    alpha: number | null;
    beta: number | null;
    gamma: number | null;
    absolute: boolean;
  }

  interface WindowEventMap {
    deviceorientation: DeviceOrientationEvent;
  }
}

export {};
