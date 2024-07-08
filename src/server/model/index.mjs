import config from '../config.mjs'
import Model from './model.mjs'

const model = new Model()
if (config.isDev) global.model = model
export default model
