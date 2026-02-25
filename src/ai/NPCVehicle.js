import * as YUKA from 'yuka';

export default class NPCVehicle extends YUKA.Vehicle {
    constructor(mesh) {
        super();

        // R3F Mesh reference for visual syncing
        this.mesh = mesh;

        // Default vehicle parameters
        this.maxSpeed = 15; // m/s
        this.mass = 1200; // kg
        this.boundingRadius = 2.5;

        // Align the vehicle with its velocity vector
        this.updateOrientation = true;
    }

    // Called by the R3F useFrame loop after the Yuka engine ticks
    update() {
        if (this.mesh) {
            // Sync Yuka's position/rotation array to Three.js Object3D
            this.mesh.position.copy(this.position);
            this.mesh.quaternion.copy(this.rotation);
        }
    }
}
