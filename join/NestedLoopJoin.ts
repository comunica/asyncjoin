import { UnionIterator, AsyncIterator } from 'asynciterator';

export function nestedLoopJoin<L, R, T>(leftIter: AsyncIterator<L>, rightIter: AsyncIterator<R>, funJoin: (left: L, right: R) => T) {
    return new UnionIterator(leftIter.map(left => rightIter.clone().map(right => funJoin(left, right))), { autoStart: false });
}
