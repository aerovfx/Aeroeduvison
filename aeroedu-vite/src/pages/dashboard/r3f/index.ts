import { basicsSimulations } from './SimBasics'
import { physicsSimulations } from './SimPhysics'
import { shadersSimulations } from './SimShaders'
import { fpvSimulations } from './SimFpvDrone'

export const ALL_SIMS: Record<string, React.ComponentType> = {
  ...basicsSimulations,
  ...physicsSimulations,
  ...shadersSimulations,
  ...fpvSimulations,
}
