/**
 * Newton Physics Engine
 * Implements F = ma physics simulation for 2D canvas
 */

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface PhysicsObject {
  position: Vector3D;
  velocity: Vector3D;
  mass: number;
  radius: number;
  color: string;
}

export interface PhysicsStats {
  force: Vector3D;
  acceleration: Vector3D;
  velocity: Vector3D;
  speed: number;
  kineticEnergy: number;
}

export class NewtonPhysicsEngine {
  private canvasWidth: number;
  private canvasHeight: number;
  private friction: number = 0.95; // Friction coefficient
  private gravity: number = 0; // No gravity on horizontal plane
  private boundaryRestitution: number = 0.7; // Bounce factor

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
  }

  /**
   * Create a physics object
   */
  static createObject(
    x: number,
    y: number,
    mass: number,
    radius: number,
    color: string
  ): PhysicsObject {
    return {
      position: { x, y, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      mass,
      radius,
      color
    };
  }

  /**
   * Apply force to object (F = ma)
   */
  applyForce(object: PhysicsObject, force: Vector3D) {
    // Force is applied per frame, will be integrated in update()
    // Store force in object temporarily (or use external state)
    // For now, we'll calculate acceleration directly
    const acceleration = {
      x: force.x / object.mass,
      y: force.y / object.mass,
      z: force.z / object.mass
    };

    // Update velocity with acceleration
    const dt = 0.016; // ~60fps
    object.velocity.x += acceleration.x * dt;
    object.velocity.y += acceleration.y * dt;
    object.velocity.z += acceleration.z * dt;
  }

  /**
   * Update physics object (one frame)
   */
  update(object: PhysicsObject) {
    const dt = 0.016; // ~60fps

    // Apply gravity (if any)
    object.velocity.y += this.gravity * dt;

    // Apply friction
    object.velocity.x *= this.friction;
    object.velocity.y *= this.friction;
    object.velocity.z *= this.friction;

    // Update position
    object.position.x += object.velocity.x * dt;
    object.position.y += object.velocity.y * dt;
    object.position.z += object.velocity.z * dt;

    // Boundary collision (keep object on canvas)
    const minX = object.radius;
    const maxX = this.canvasWidth - object.radius;
    const minY = object.radius;
    const maxY = this.canvasHeight - object.radius;

    // X boundary
    if (object.position.x < minX) {
      object.position.x = minX;
      object.velocity.x *= -this.boundaryRestitution;
    } else if (object.position.x > maxX) {
      object.position.x = maxX;
      object.velocity.x *= -this.boundaryRestitution;
    }

    // Y boundary
    if (object.position.y < minY) {
      object.position.y = minY;
      object.velocity.y *= -this.boundaryRestitution;
    } else if (object.position.y > maxY) {
      object.position.y = maxY;
      object.velocity.y *= -this.boundaryRestitution;
    }
  }

  /**
   * Get physics stats for display
   */
  getStats(object: PhysicsObject): PhysicsStats {
    // Calculate current force (F = ma)
    const acceleration = {
      x: object.velocity.x !== 0 ? object.velocity.x / 0.016 : 0, // Approximate
      y: object.velocity.y !== 0 ? object.velocity.y / 0.016 : 0,
      z: object.velocity.z !== 0 ? object.velocity.z / 0.016 : 0
    };

    const force = {
      x: acceleration.x * object.mass,
      y: acceleration.y * object.mass,
      z: acceleration.z * object.mass
    };

    const speed = Math.sqrt(
      object.velocity.x ** 2 +
      object.velocity.y ** 2 +
      object.velocity.z ** 2
    );

    const kineticEnergy = 0.5 * object.mass * speed ** 2;

    return {
      force,
      acceleration,
      velocity: { ...object.velocity },
      speed,
      kineticEnergy
    };
  }

  /**
   * Reset object to center
   */
  reset(object: PhysicsObject, x: number, y: number) {
    object.position = { x, y, z: 0 };
    object.velocity = { x: 0, y: 0, z: 0 };
  }
}

/**
 * Helper functions
 */
export function formatVector(v: Vector3D, decimals: number = 2): string {
  return `(${v.x.toFixed(decimals)}, ${v.y.toFixed(decimals)}, ${v.z.toFixed(decimals)})`;
}

export function getMagnitude(v: Vector3D): number {
  return Math.sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2);
}

