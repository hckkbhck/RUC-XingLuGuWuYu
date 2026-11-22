import {WIDTH, baotaRoad, entrance, places} from './layout.js';
import {clearSegment, findRoute} from './navigation.js';

const routes = {
    'bus-stop': {
        'tz-bus-stop': [],
        pond: [[436,532],[436,260],[207,260]],
        canteen: [[1316,532],[1316,294],[917,294],[917,159]],
        lawn: [[855,532]]
    },
    'tz-bus-stop': {'bus-stop': []}
};
export const stationName = p => p.id === 'bus-stop' ? '中关村东门公交站' : p.name;
export function distanceToStation(stop, x, y) {
    const curb = entrance(stop);
    // Both shelters have rectangular footprints. Players can approach any exposed side.
    const [width, height] = stop.shape[2];
    const dx = Math.max(stop.x-x, 0, x-stop.x-width);
    const dy = Math.max(stop.y-y, 0, y-stop.y-height);
    return Math.min(Math.hypot(dx,dy), Math.hypot(x-curb.x,y-curb.y));
}
export function stationDestinations(id) {
    return Object.keys(routes[id] ?? {}).map(key => places.find(p => p.id===key));
}
export function busTrip(origin, id, passenger) {
    const stops = routes[origin?.id]?.[id];
    if (!Array.isArray(stops)) return null;
    const start = entrance(origin), end = entrance(places.find(p => p.id===id));
    const roadY = baotaRoad.y + baotaRoad.h/2;
    const ride = stops.length ? stops : [[end.x,roadY]];
    const direction = Math.sign(ride[0][0]-start.x);
    const door = {x:start.x-direction*15, y:roadY+5};
    let approach = [];
    if (passenger && !clearSegment(passenger,door)) {
        const path = findRoute(passenger,origin);
        if (!path.length) return null;
        approach = path.slice(1).map(p=>['approach',p.x,p.y]);
    }
    return {
        x:Math.min(WIDTH-44,Math.max(44,start.x-direction*150)), y:roadY,
        leftward:direction<0,
        legs:[['arrive',start.x,roadY],...approach,['board',door.x,door.y],
            ...ride.map(([x,y])=>['ride',x,y]),['exit',end.x,end.y]]
    };
}
