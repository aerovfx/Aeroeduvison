import { basicsSimulations } from './SimBasics'
import { physicsSimulations } from './SimPhysics'
import { shadersSimulations } from './SimShaders'

export const ALL_SIMS: Record<string, React.ComponentType> = {
  ...basicsSimulations,
  ...physicsSimulations,
  ...shadersSimulations,
}
