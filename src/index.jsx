/** @jsx createElement */
import _ from 'lodash'
import { createElement } from 'elliptical'
import { Command } from 'lacona-phrases'
import { onActivate } from 'lacona-source-helpers'
import { stat } from 'mz/fs'
import { execFile } from 'mz/child_process'
import globby from 'globby'
import path from 'path'
import expandHomeDir from 'expand-home-dir'

const IMG_PATH = path.join(__dirname, '../icon.png')

async function fetchScripts ({props}) {
  const directory = expandHomeDir(props.directory)

  let stats
  try {
    stats = await stat(directory)
  } catch (e) {
    console.error('directory', directory, 'does not exist')
    return []
  }

  if (!stats.isDirectory()) {
    console.error(directory, 'is not a directory')
    return []
  }

  const names = await globby(
    ['**/*.scpt', '**/*.applescript', '**/*.app', '!**/*.app/**/*'],
    {cwd: directory}
  )

  const data = _.map(names, name => {
    const fullPath = path.join(directory, name)
    const parsed = path.parse(name)
    const displayName = path.join(parsed.dir, parsed.name)

    return {
      path: fullPath,
      name: displayName
    }
  })

  return data
}

// Look for new repos every hour
const ScriptSource = onActivate(fetchScripts, [])

const RunScriptCommand = {
  extends: [Command],
  execute (result) {
    execFile('/usr/bin/osascript', [result])
  },
  describe ({observe, config}) {
    let allScripts = []
    if (config.enableGlobalScripts) {
      allScripts = [...allScripts, ...observe(<ScriptSource directory='/Library/Scripts' />)]
    }
    if (config.enableUserScripts) {
      allScripts = [...allScripts, ...observe(<ScriptSource directory='~/Library/Scripts' />)]
    }
    if (config.customScriptsDirectory) {
      allScripts = [...allScripts, ...observe(<ScriptSource directory={config.customScriptsDirectory} />)]
    }

    const items = _.map(allScripts, ({path, name}) => ({
      text: name,
      value: path
    }))

    if (!items.length) return null

    return (
      <sequence>
        <list items={['run ', 'execute ', 'do ', 'perform ']} />
        <placeholder argument='applescript' merge>
          <list items={items} strategy='fuzzy' annotation={{type: 'image', value: IMG_PATH}} />
        </placeholder>
      </sequence>
    )
  }
}

export const extensions = [RunScriptCommand]
