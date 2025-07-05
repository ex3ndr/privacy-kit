import { Point } from "./math/point";
import { generateRandomScalar, isValidScalar } from "./math/scalar";

export class MacGGM<TMessages extends readonly string[]> {

    static create<TMessages extends readonly string[]>(name: string, messages: TMessages) {
        const generator = Point.fromHash(name + " Generator Seed", 'macggm');
        const messagePoints: { [key in keyof TMessages]: Point } = {} as any;
        for (const message of messages) {
            messagePoints[message as keyof TMessages] = Point.fromHash(name + " " + message + " Point", 'macggm');
        }
        return new MacGGM<TMessages>(generator, messages, messagePoints);
    }

    #generator: Point;
    #messages: TMessages;
    #messagePoints: { [key in keyof TMessages]: Point };

    private constructor(generator: Point, messages: TMessages, messagePoints: { [key in keyof TMessages]: Point }) {
        this.#messages = messages;
        this.#generator = generator;
        this.#messagePoints = messagePoints;
        Object.freeze(this);
    }

    generateKey(): MacGGMKey<TMessages> {
        const base = generateRandomScalar(Point.ORDER);
        const key: { [key in keyof TMessages]: bigint; } = {} as any;
        for (const message of this.#messages) {
            key[message as keyof TMessages] = generateRandomScalar(Point.ORDER);
        }
        return new MacGGMKey(base, key);
    }

    mac(key: MacGGMKey<TMessages>, message: MacGGMMessage<TMessages>): Point {
        let result = this.#generator.multiply(key.base);
        
        for (let i = 0; i < this.#messages.length; i++) {
            const messageType = this.#messages[i];
            const messageData = message[messageType as keyof TMessages];
            const messageScalar = this.#messages[i] as keyof TMessages;
            
            const messagePoint = Point.fromHash(messageData, 'macggm_message');
            const keyScalar = key.keys[messageScalar];
            
            result = result.add(messagePoint.multiply(keyScalar));
        }
        
        return result;
    }

    verify(key: MacGGMKey<TMessages>, message: MacGGMMessage<TMessages>, tag: Point): boolean {
        const computedTag = this.mac(key, message);
        return computedTag.toBytes().every((byte, index) => byte === tag.toBytes()[index]);
    }
}

export class MacGGMKey<TMessages extends readonly string[]> {
    readonly base: bigint;
    readonly keys: {
        readonly [key in keyof TMessages]: bigint;
    };

    constructor(base: bigint, keys: {
        [key in keyof TMessages]: bigint;
    }) {
        if (!isValidScalar(base, Point.ORDER)) {
            throw new Error('Invalid base');
        }
        for (const key of Object.values(keys)) {
            if (!isValidScalar(key, Point.ORDER)) {
                throw new Error('Invalid key');
            }
        }
        this.base = base;
        this.keys = keys;
        Object.freeze(this);
    }
}


export type MacGGMMessage<TMessages extends readonly string[]> = {
    [key in keyof TMessages]: Uint8Array;
}


