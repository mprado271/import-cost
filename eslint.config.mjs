import { antfu } from '@antfu/eslint-config'

export default antfu({
  rules: {
    'antfu/no-import-dist': 'off',
    'node/prefer-global/process': 'off',
    'ts/ban-ts-comment': 'off',
  },
})
