import { h, render } from 'https://esm.sh/preact@10.13.2'
import htm from 'https://esm.sh/htm@3.1.1'
import {
  signal,
  computed,
  effect,
  batch
} from 'https://esm.sh/@preact/signals@1.1.3'

import fromNow from 'https://esm.sh/fromnow'

import {
  serialize,
  deserialize
} from 'https://esm.sh/gh/ludlovian/pixutil/json'

const html = htm.bind(h)

export {
  render,
  h,
  html,
  signal,
  computed,
  batch,
  effect,
  fromNow,
  serialize,
  deserialize
}
