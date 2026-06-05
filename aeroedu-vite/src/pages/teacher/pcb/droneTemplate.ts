/** Mẫu PCB "Drone Flight Controller" — giữ API cũ, nay dựng từ thư viện mẫu
 *  chung (pcbTemplates). Toạ độ board tính bằng MM. */
import { buildTemplate, DRONE } from './pcbTemplates'

export function makeDroneTemplate() { return buildTemplate(DRONE) }
