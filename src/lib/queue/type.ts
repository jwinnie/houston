/**
 * houston/src/lib/queue/type.ts
 * Some typescript types for a queue system.
 */

import { EventEmitter } from 'events'

export type Status = 'waiting' | 'active' | 'completed' | 'failed' | 'delayed'

export type OnActiveCallback = (job: IJob) => void
export type OnProgressCallback = (job: IJob, amount: number) => void
export type OnFailedCallback = (job: IJob, error: Error) => void
export type OnCompletedCallback = (job: IJob, result: object) => void

export type IQueueConstructor = (name: string) => IQueue

export interface IQueue {
  send (data: object, opts?: IJobOptions): Promise<IJob>
  handle<T, R> (T): Promise<R>

  pause (local: boolean): Promise<void>
  resume (local: boolean): Promise<void>

  connect (): Promise<void>
  close (): Promise<void>

  empty (): Promise<void>
  count (state?: Status): Promise<number>
  jobs (state: Status): Promise<IJob[]>

  onActive (fn: OnActiveCallback)
  onProgress (fn: OnProgressCallback)
  onFailed (fn: OnFailedCallback)
  onCompleted (fn: OnCompletedCallback)
}

export interface IJobOptions {
  priority?: number
  delay?: number
  attempts?: number
  timeout?: number
}

export interface IJob {
  status (): Promise<Status>
  progress (amount: number)

  remove (): Promise<void>
}
