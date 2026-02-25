import * as YUKA from 'yuka';

class NPCManager {
    constructor() {
        this.entityManager = new YUKA.EntityManager();
        this.time = new YUKA.Time();
    }

    add(entity) {
        this.entityManager.add(entity);
    }

    remove(entity) {
        this.entityManager.remove(entity);
    }

    update() {
        const delta = this.time.update().getDelta();
        this.entityManager.update(delta);
    }
}

// Export as a singleton so it can be accessed globally within the R3F scene
const instance = new NPCManager();
export default instance;
