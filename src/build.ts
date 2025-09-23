import type { LogLevel, Message } from 'esbuild'
import type { PackageInfo } from './babel'
import { basename, dirname } from 'node:path'
import { gzipSize } from 'gzip-size'
import QuickLRU from 'quick-lru'

export interface PackageInfoWithSize extends PackageInfo {
  size: number
  gzip: number
  fail?: true
}

export interface getSizeOptions {
  esbuildPath?: string
  external?: string[]
  logLevel?: LogLevel
}

export interface GetSizeResult {
  errors: Message[]
  warnings: Message[]
  package: PackageInfoWithSize
}

export const cache = new QuickLRU<string, GetSizeResult>({ maxSize: 100 })

export async function getSize({ path, name, line, string }: PackageInfo, { esbuildPath, external, logLevel }: getSizeOptions = {}): Promise<GetSizeResult> {
  if (cache.has(string))
    return cache.get(string)!

  const { build } = await import(esbuildPath ?? 'esbuild') as typeof import('esbuild')

  const { errors, warnings, outputFiles } = await build({
    stdin: {
      contents: string,
      resolveDir: dirname(path),
      sourcefile: basename(path),
    },
    bundle: true,
    format: 'esm',
    external,
    write: false,
    outdir: 'dist', // make multi output work
    allowOverwrite: true, // don't worry, `write: false` will work
    minify: true,
    logLevel: logLevel ?? 'silent',
  }).catch(convertError)

  let size, gzip, fail: true | undefined
  if (outputFiles.length > 0) {
    size = outputFiles[0].contents.byteLength
    gzip = await gzipSize(outputFiles[0].text)
  }
  else {
    size = gzip = 0
    fail = true
  }
  const result = { errors, warnings, package: { path, name, line, string, size, gzip, fail } }
  if (errors.length === 0 && warnings.length === 0)
    cache.set(string, result)
  return result
}

function convertError(e: any) {
  return {
    errors: e.errors || [],
    warnings: e.warnings || [],
    outputFiles: [],
  }
}
