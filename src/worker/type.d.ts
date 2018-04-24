/**
 * houston/src/worker/type.d.ts
 * A bunch of type definitions for the worker process
 */

import { Config } from '../lib/config'
import { Level } from '../lib/log/level'
import { Repository } from '../lib/service/base/repository'
import { EventEmitter } from '../lib/utility/eventemitter'

type Type = 'app' | 'system-app' | 'library' | 'system-library' | 'debug'
type PackageSystem = 'deb'

export interface IPackage {
  type: PackageSystem
  path: string // Full path on the FS
}

export interface IResult {
  failed: boolean

  packages: IPackage[]

  appcenter?: object
  appstream?: string

  logs: ILog[]
}

export interface ILog extends Error {
  level: Level
  title: string
  body?: string
}

export interface IChange {
  version: string
  author: string
  changes: string
  date: Date
}

export interface IContext {
  type: Type

  nameDeveloper: string
  nameDomain: string
  nameAppstream: string
  nameHuman: string

  version: string

  architecture: string
  distribution: string

  references: string[]
  changelog: IChange[]

  packageSystem: PackageSystem
  packagePath?: string

  appcenter?: object
  appstream?: string // An XML formatted string

  stripe?: string

  logs: ILog[]
}

export interface ITaskConstructor {
  new (worker: IWorker): ITask
}

export interface ITask {
  run (): Promise<void>
}

export interface IWorker extends EventEmitter {
  config: Config
  context: IContext
  repository: Repository
  workspace: string

  report (err: Error)
  stop ()
}

export type IPreset = (config: Config, repository: Repository, context: IContext)
