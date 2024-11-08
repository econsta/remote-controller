import type { Receiver } from './receiver.js'

export declare type Primitive =
    | undefined
    | null
    | boolean
    | number
    | string
    | Blob
    | ArrayBuffer
export declare type ObjectID = number
export declare type CallbackID = number
export declare type GetID = number
export declare type FlushID = number
export declare type PathType = (string | symbol)[]

export declare abstract class Messenger {
    abstract postMessage(message: any): void
}

export interface MessageShim {
    new(reciever: Receiver, ...args: any[]): any
}

export declare type Result = {
    getId: GetID
    valueData: Arg
}

export declare type ControllerMessageCommands = {
    type: 1
    commands: Command[]
    flushId: FlushID
}

export declare type ControllerMessageCleanup = {
    type: 0
    ids: ObjectID[]
}

export declare type ControllerMessage =
    | ControllerMessageCommands
    | ControllerMessageCleanup

export declare type ReceiverMessageDone = {
    type: 0
    flushId: FlushID
    results: Result[]
}

export declare type ReceiverMessageCallback = {
    type: 1
    id: CallbackID
    args: Arg[]
}

export declare type ReceiverMessage =
    | ReceiverMessageDone
    | ReceiverMessageCallback

type ArgPrimitive = {
    type: 0 //Primitive
    value: Primitive
}

type ArgObject = {
    root: object
    refs: object
}

type ArgRemote = {
    type: 2 //Remote
    value: ObjectID
    path: PathType
}

type ArgFunction = {
    type: 3 //Function
    scope: object
    func: string
}

type ArgCallback = {
    type: 4 //Callback
    value: CallbackID
}

export declare type Arg = ArgObject

export declare type CommandCall = {
    type: 0
    objectId: ObjectID
    path: PathType
    argsData: (Arg | Promise<Arg>)[]
    returnId: ObjectID
}

export declare type CommandSet = {
    type: 1
    objectId: ObjectID
    path: PathType
    argsData: Arg | Promise<Arg>
}

export declare type CommandGet = {
    type: 2
    objectId: ObjectID
    path: PathType
    getId: GetID
}

export declare type CommandConstruct = {
    type: 3
    objectId: ObjectID
    path: PathType
    argsData: (Arg | Promise<Arg>)[]
    returnId: ObjectID
}

export declare type Command =
    | CommandCall
    | CommandSet
    | CommandGet
    | CommandConstruct

export declare type Resolve = {
    objectId: number
    path: string[]
    resolve: (value: any) => void
}

type RemoteParams<P extends readonly any[]> = {
    [key in keyof P]: Remote<P[key]> | P[key]
}

type RemoteFunction<T> = {
    [key in keyof Exclude<T, undefined> as T[key] extends Function
    ? key
    : never]: T[key] extends (...args: infer P) => infer R
    ? (...args: RemoteParams<P>) => RemoteRoot<Awaited<R>>
    : never
}
// Exclude<T, undefined> as T[key] extends readonly object ? key : never

type RemoteObject<T> = {
    [key in keyof T]: T[key] extends object ? Remote<T[key]> : Promise<T[key]>
}

type RemotePromise<T> = Promise<{
    [key in keyof T]: T[key] extends object ? Remote<Awaited<T[key]>> : T[key]
}>

type Remote<T> = RemoteFunction<T> & RemoteObject<T> & RemotePromise<T>

export type RemoteRoot<T> = T extends object ? Remote<T> : T
