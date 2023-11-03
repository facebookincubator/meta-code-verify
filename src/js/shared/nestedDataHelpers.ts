/**
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export function setOrUpdateMapInMap<OuterKey, InnerKey, Value>(
  outerMap: Map<OuterKey, Map<InnerKey, Value>>,
  outerKey: OuterKey,
  innerKey: InnerKey,
  value: Value,
): Map<OuterKey, Map<InnerKey, Value>> {
  const innerMap = outerMap.get(outerKey) ?? new Map();
  innerMap.set(innerKey, value);
  if (!outerMap.has(outerKey)) {
    outerMap.set(outerKey, innerMap);
  }
  return outerMap;
}

export function setOrUpdateSetInMap<OuterKey, Value>(
  outerMap: Map<OuterKey, Set<Value>>,
  outerKey: OuterKey,
  value: Value,
): Map<OuterKey, Set<Value>> {
  const innerSet = outerMap.get(outerKey) ?? new Set();
  innerSet.add(value);
  if (!outerMap.has(outerKey)) {
    outerMap.set(outerKey, innerSet);
  }
  return outerMap;
}

export function pushToOrCreateArrayInMap<OuterKey, Value>(
  outerMap: Map<OuterKey, Array<Value>>,
  outerKey: OuterKey,
  value: Value,
): Map<OuterKey, Array<Value>> {
  const innerArray = outerMap.get(outerKey) ?? [];
  innerArray.push(value);
  if (!outerMap.has(outerKey)) {
    outerMap.set(outerKey, innerArray);
  }
  return outerMap;
}
