import { AsyncIterator, UnionIterator } from 'asynciterator';

export function dynamicNestedLoopJoin<L, R, T>(leftIter: AsyncIterator<L>, funRight: (left: L) => AsyncIterator<R>, funJoin: (left: L, right: R) => T) {
    return new UnionIterator(leftIter.map(left => funRight(left).map(right => funJoin(left, right))), { autoStart: false });
}
