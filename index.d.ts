
import { AsyncIterator, MultiTransformIterator, SimpleTransformIterator } from 'asynciterator';

export class DynamicNestedLoopJoin<L, R, T> extends MultiTransformIterator<L, T>
{
    constructor(left: AsyncIterator<L>, funRight: (L) => AsyncIterator<R>, funJoin: (L, R) => T);

    // problem due to async typings
    // protected _createTransformer(leftItem: L): SimpleTransformIterator<L, T>;
}

export class HashJoin<S, H, T> extends AsyncIterator<T>
{
    constructor(left: AsyncIterator<S>, right: AsyncIterator<S>, funHash: (S) => H, funJoin: (S, S) => T);
    protected hasResults(): boolean;
    close(): void;
    read(): T;
}

export class NestedLoopJoin<L, R, T> extends MultiTransformIterator<L, T>
{
    constructor(left: AsyncIterator<L>, right: AsyncIterator<R>, funJoin: (L, R) => T);
    close(): void;

    // problem due to async typings
    // protected _createTransformer(leftItem: L): SimpleTransformIterator<L, T>;
}

export class SymmetricHashJoin<S, H, T> extends AsyncIterator<T>
{
    constructor(left: AsyncIterator<S>, right: AsyncIterator<S>, funHash: (S) => H, funJoin: (S, S) => T);
    protected hasResults(): boolean;
    close(): void;
    read(): T;
}