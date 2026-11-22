import {
    _decorator, Color, Component, EventKeyboard, Game, Graphics, Input, KeyCode, Label,
    Mat4, Node, Sprite, SpriteFrame, TiledMap, UITransform, game, input, resources, sys, warn,
} from 'cc';
import { CampusBuilding } from './CampusBuilding';

const { ccclass, property } = _decorator;
const DIRECTIONS = ['down', 'left', 'right', 'up'] as const;
type Direction = typeof DIRECTIONS[number];
const FOOT_RADIUS = 8;
const ENTRANCE_RANGE = 52;
const INK = new Color('#263A37');
const PAPER = new Color('#FFF3DA');
const RED = new Color('#9B3837');
const GOLD = new Color('#E9BA74');

function clamp(value: number, low: number, high: number): number {
    return Math.max(low, Math.min(value, high));
}

function element(parent: Node, name: string, width: number, height: number): Node {
    const node = new Node(name);
    node.layer = parent.layer;
    node.parent = parent;
    node.addComponent(UITransform).setContentSize(width, height);
    return node;
}

function plate(parent: Node, name: string, width: number, height: number, color: Color): Node {
    const node = element(parent, name, width, height);
    const g = node.addComponent(Graphics);
    g.fillColor = new Color(26, 32, 27, 75);
    g.roundRect(-width / 2 + 1, -height / 2 - 3, width, height, 7);
    g.fill();
    g.fillColor = color;
    g.roundRect(-width / 2, -height / 2, width, height, 7);
    g.fill();
    return node;
}

function caption(parent: Node, name: string, text: string, x: number, y: number,
    width: number, height: number, size: number, color: Color, bold = false): Label {
    const node = element(parent, name, width, height);
    node.setPosition(x, y);
    const label = node.addComponent(Label);
    label.fontFamily = 'sans-serif';
    label.overflow = Label.Overflow.SHRINK;
    label.enableWrapText = true;
    label.horizontalAlign = Label.HorizontalAlign.LEFT;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.fontSize = size;
    label.lineHeight = Math.round(size * 1.4);
    label.color = color;
    label.isBold = bold;
    label.string = text;
    return label;
}

@ccclass('CampusWalk')
export class CampusWalk extends Component {
    @property({ displayName: '步行速度', min: 1 })
    walkSpeed = 175;

    private player!: Node;
    private playerSize!: UITransform;
    private sprite!: Sprite;
    private canvas!: UITransform;
    private buildings!: Node;
    private institutions: CampusBuilding[] = [];
    private readonly present: CampusBuilding[] = [];
    private readonly inverse = new Mat4();
    private readonly keys = new Set<KeyCode>();
    private readonly frames: Record<Direction, SpriteFrame[]> = { down: [], left: [], right: [], up: [] };
    private face: Direction = 'down';
    private animationTime = 0;
    private frame = 0;
    private mapWidth = 1920;
    private mapHeight = 1024;
    private viewportWidth = 0;
    private viewportHeight = 0;
    private current: CampusBuilding | null = null;
    private location!: Node;
    private controls!: Node;
    private prompt!: Node;
    private promptText!: Label;
    private detail!: Node;
    private detailTitle!: Label;
    private detailBody!: Label;
    private readonly clearKeys = () => this.keys.clear();

    onEnable() {
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
        game.on(Game.EVENT_HIDE, this.clearKeys, this);
        if (sys.isBrowser) window.addEventListener('blur', this.clearKeys);
    }

    onDisable() {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
        input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
        game.off(Game.EVENT_HIDE, this.clearKeys, this);
        if (sys.isBrowser) window.removeEventListener('blur', this.clearKeys);
        this.clearKeys();
    }

    start() {
        const parent = this.node.parent!;
        this.canvas = parent.getComponent(UITransform)!;
        this.player = this.node.getChildByName('Player')!;
        this.playerSize = this.player.getComponent(UITransform)!;
        this.sprite = this.player.getComponent(Sprite)!;
        this.buildings = this.node.getChildByName('Buildings')!;
        this.institutions = this.buildings.getComponentsInChildren(CampusBuilding);
        const terrain = this.node.getChildByName('Terrain')?.getComponent(TiledMap);
        if (terrain?.tmxAsset) {
            const cells = terrain.getMapSize();
            const tile = terrain.getTileSize();
            if (cells.width && cells.height && tile.width && tile.height) {
                this.mapWidth = cells.width * tile.width;
                this.mapHeight = cells.height * tile.height;
            }
        }
        this.makeHud(parent.getChildByName('HUD')!);
        this.measureBuildings();
        this.checkEntrance();
        this.followPlayer();
        this.loadFrames();
    }

    private makeHud(hud: Node) {
        this.location = plate(hud, 'Location', 188, 38, INK);
        const seal = this.location.getComponent(Graphics)!;
        seal.fillColor = GOLD;
        seal.moveTo(-77, -6);
        seal.lineTo(-77, 5);
        seal.lineTo(-70, 10);
        seal.lineTo(-63, 5);
        seal.lineTo(-63, -6);
        seal.close();
        seal.fill();
        seal.fillColor = INK;
        seal.rect(-72, -6, 4, 7);
        seal.fill();
        caption(this.location, 'District', '中关村校区 · 教学区', 14, 0, 142, 28, 15, PAPER, true);
        this.controls = plate(hud, 'Controls', 163, 32, INK);
        caption(this.controls, 'Keyboard', 'WASD / 方向键 移动', 0, 0, 141, 26, 14, PAPER);

        this.prompt = plate(hud, 'EntrancePrompt', 242, 44, PAPER);
        const key = plate(this.prompt, 'InteractKey', 28, 27, RED);
        key.setPosition(-96, 0);
        caption(key, 'Key', 'E', 0, 0, 11, 24, 16, PAPER, true);
        this.promptText = caption(this.prompt, 'Action', '', 17, 0, 183, 30, 16, INK, true);
        this.prompt.active = false;
        this.prompt.on(Node.EventType.TOUCH_END, this.openDetail, this);

        this.detail = plate(hud, 'BuildingDetail', 390, 172, PAPER);
        const header = this.detail.getComponent(Graphics)!;
        header.fillColor = RED;
        header.roundRect(-172, 24, 4, 32, 2);
        header.fill();
        this.detailTitle = caption(this.detail, 'Title', '', 8, 40, 330, 40, 25, RED, true);
        this.detailBody = caption(this.detail, 'Description', '', 0, -7, 344, 55, 17, INK);
        const close = plate(this.detail, 'Close', 94, 26, INK);
        close.setPosition(124, -59);
        caption(close, 'CloseLabel', 'Esc  关闭', 0, 0, 68, 23, 14, PAPER);
        close.on(Node.EventType.TOUCH_END, this.closeDetail, this);
        this.detail.active = false;
    }

    private loadFrames() {
        for (const direction of DIRECTIONS) {
            for (let i = 0; i < 4; i++) {
                const path = `characters/walk-${direction}-${i}/spriteFrame`;
                resources.load(path, SpriteFrame, (err, asset) => {
                    if (!this.isValid) return;
                    if (err) { warn(`角色帧读取失败 ${path}`, err); return; }
                    this.frames[direction][i] = asset;
                    if (this.face === direction && this.frame === i) this.sprite.spriteFrame = asset;
                });
            }
        }
    }

    private onKeyDown(event: EventKeyboard) {
        const key = event.keyCode;
        if (key === KeyCode.ESCAPE) {
            this.closeDetail();
        } else if (key === KeyCode.KEY_E) {
            this.openDetail();
        } else if (!this.detail?.active) {
            this.keys.add(key);
        }
    }

    private onKeyUp(event: EventKeyboard) {
        this.keys.delete(event.keyCode);
    }

    private openDetail() {
        if (!this.current || !this.detail || this.detail.active) return;
        this.detailTitle.string = this.current.displayName;
        this.detailBody.string = this.current.description;
        this.clearKeys();
        this.detail.active = true;
        this.prompt.active = false;
    }

    private closeDetail() {
        if (!this.detail?.active) return;
        this.detail.active = false;
        this.prompt.active = !!this.current;
    }

    private measureBuildings() {
        Mat4.invert(this.inverse, this.node.worldMatrix);
        this.present.length = 0;
        for (const institution of this.institutions) {
            if (institution.measure(this.inverse)) this.present.push(institution);
        }
    }

    private checkEntrance() {
        const feet = this.player.position;
        let nearest: CampusBuilding | null = null;
        let distance = ENTRANCE_RANGE * ENTRANCE_RANGE;
        for (const building of this.present) {
            const dx = feet.x - building.door.x;
            const dy = feet.y - building.door.y;
            const squared = dx * dx + dy * dy;
            if (squared <= distance) { nearest = building; distance = squared; }
        }
        if (nearest === this.current) return;
        this.current = nearest;
        this.prompt.active = !!nearest && !this.detail.active;
        if (nearest) this.promptText.string = `查看${nearest.displayName}`;
    }

    /** Sweep one axis at a time so diagonal input slides along a blocked wall. */
    private sweep(horizontal: boolean, start: number, across: number, delta: number): number {
        if (!delta) return start;
        const limit = (horizontal ? this.mapWidth : this.mapHeight) / 2;
        const size = horizontal ? this.playerSize.width : this.playerSize.height;
        const anchor = horizontal ? this.playerSize.anchorX : this.playerSize.anchorY;
        const minimum = -limit + Math.max(FOOT_RADIUS, size * anchor);
        const maximum = limit - Math.max(FOOT_RADIUS, size * (1 - anchor));
        let end = clamp(start + delta, minimum, maximum);
        for (const building of this.present) {
            const b = building.bounds;
            const acrossMin = (horizontal ? b.yMin : b.xMin) - FOOT_RADIUS;
            const acrossMax = (horizontal ? b.yMax : b.xMax) + FOOT_RADIUS;
            if (across <= acrossMin || across >= acrossMax) continue;
            const near = (horizontal ? b.xMin : b.yMin) - FOOT_RADIUS;
            const far = (horizontal ? b.xMax : b.yMax) + FOOT_RADIUS;
            if (delta > 0 && start <= near) end = Math.min(end, near);
            if (delta < 0 && start >= far) end = Math.max(end, far);
        }
        return end;
    }

    private animate(moving: boolean, dt: number) {
        this.animationTime = moving ? this.animationTime + dt : 0;
        this.frame = moving ? Math.floor(this.animationTime * 9) % 4 : 0;
        const frame = this.frames[this.face][this.frame];
        if (frame && this.sprite.spriteFrame !== frame) this.sprite.spriteFrame = frame;
    }

    private followPlayer() {
        const { width, height } = this.canvas;
        const feet = this.player.position;
        const scale = Math.max(1, width / this.mapWidth, height / this.mapHeight);
        const rangeX = Math.max(0, (this.mapWidth * scale - width) / 2);
        const rangeY = Math.max(0, (this.mapHeight * scale - height) / 2);
        if (width !== this.viewportWidth || height !== this.viewportHeight) {
            this.viewportWidth = width;
            this.viewportHeight = height;
            this.node.setScale(scale, scale, 1);
            this.location.setPosition(-width / 2 + 110, height / 2 - 33);
            this.controls.setPosition(-width / 2 + 97.5, -height / 2 + 30);
            this.prompt.setPosition(0, -height / 2 + (width >= 660 ? 36 : 75));
            const detailScale = Math.min(1, (width - 26) / 390);
            this.detail.setScale(detailScale, detailScale, 1);
        }
        const offsetX = clamp(-feet.x * scale, -rangeX, rangeX);
        const offsetY = clamp(-feet.y * scale, -rangeY, rangeY);
        if (offsetX !== this.node.position.x || offsetY !== this.node.position.y) {
            this.node.setPosition(offsetX, offsetY);
        }

        // The prefabs stay editable under Buildings. Switch the player's draw order
        // when its feet pass behind a facade, keeping Terrain below both siblings.
        const behind = this.present.some(({ bounds }) => feet.x > bounds.xMin - 22
            && feet.x < bounds.xMax + 22 && feet.y > bounds.yMin + FOOT_RADIUS);
        const buildingsIndex = this.buildings.getSiblingIndex();
        if (behind !== (this.player.getSiblingIndex() < buildingsIndex)) {
            this.player.setSiblingIndex(buildingsIndex);
        }
    }

    update(dt: number) {
        if (!this.player) return;
        this.measureBuildings();
        const pressed = (a: KeyCode, b: KeyCode) => Number(this.keys.has(a) || this.keys.has(b));
        const dx = pressed(KeyCode.KEY_D, KeyCode.ARROW_RIGHT) - pressed(KeyCode.KEY_A, KeyCode.ARROW_LEFT);
        const dy = pressed(KeyCode.KEY_W, KeyCode.ARROW_UP) - pressed(KeyCode.KEY_S, KeyCode.ARROW_DOWN);
        let moving = false;
        if (!this.detail.active && (dx || dy)) {
            const feet = this.player.position;
            const step = this.walkSpeed * Math.min(dt, 0.1) / Math.hypot(dx, dy);
            const x = this.sweep(true, feet.x, feet.y, dx * step);
            const y = this.sweep(false, feet.y, x, dy * step);
            moving = x !== feet.x || y !== feet.y;
            this.face = dx && (x !== feet.x || !dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'up' : 'down');
            this.player.setPosition(x, y, feet.z);
        }
        this.animate(moving, dt);
        this.checkEntrance();
        this.followPlayer();
    }
}
