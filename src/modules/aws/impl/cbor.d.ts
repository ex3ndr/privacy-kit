/**
 * CBOR (Concise Binary Object Representation) implementation
 * Ported from JavaScript to TypeScript
 *
 * Original MIT License notice:
 * The MIT License (MIT)
 * Copyright (c) 2014-2016 Patrick Gansterer <paroga@paroga.com>
 */
type TagFunction = (value: any, tag: number) => any;
type SimpleValueFunction = (value: number) => any;
export declare function encodeCBOR(value: any): Uint8Array;
export declare function decodeCBOR(data: Uint8Array, tagger?: TagFunction, simpleValue?: SimpleValueFunction): any;
export {};
