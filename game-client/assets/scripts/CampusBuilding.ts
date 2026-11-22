import { _decorator, Component, Mat4, Node, Rect, UITransform, Vec3 } from 'cc';

const { ccclass, property } = _decorator;

@ccclass('CampusBuilding')
export class CampusBuilding extends Component {
    @property({ displayName: '建筑名称' })
    displayName = '';

    @property({ displayName: '建筑介绍', multiline: true })
    description = '';

    readonly bounds = new Rect();
    readonly door = new Vec3();
    private footprint: UITransform | null = null;
    private entrance: Node | null = null;
    private readonly relative = new Mat4();

    onLoad() {
        this.footprint = this.node.getChildByName('Footprint')?.getComponent(UITransform) ?? null;
        this.entrance = this.node.getChildByName('Entrance');
    }

    /** Both results use the same World coordinates as the player's feet. */
    measure(worldInverse: Mat4): boolean {
        if (!this.footprint || !this.entrance || !this.enabledInHierarchy) return false;
        const shape = this.footprint;
        const bounds = this.bounds;
        bounds.x = -shape.anchorX * shape.width;
        bounds.y = -shape.anchorY * shape.height;
        bounds.width = shape.width;
        bounds.height = shape.height;
        Mat4.multiply(this.relative, worldInverse, shape.node.worldMatrix);
        bounds.transformMat4(this.relative);
        Vec3.transformMat4(this.door, this.entrance.worldPosition, worldInverse);
        return true;
    }
}
