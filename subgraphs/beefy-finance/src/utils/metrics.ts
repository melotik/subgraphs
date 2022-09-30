import { Address, BigDecimal, BigInt, ethereum } from "@graphprotocol/graph-ts";
import {
  ActiveUser,
  FinancialsDailySnapshot,
  UsageMetricsDailySnapshot,
  UsageMetricsHourlySnapshot,
  YieldAggregator,
} from "../../generated/schema";
import {
  BIGDECIMAL_ZERO,
  BIGINT_ZERO,
  BIGINT_ONE,
} from "../prices/common/constants";
import { getOrCreateFinancials } from "./getters";
import { getDaysSinceEpoch, getHoursSinceEpoch } from "./time";

export function updateFinancialSnapshotRevenue(
  newProtocolSideRevenueUSD: BigDecimal,
  newSupplySideRevenueUSD: BigDecimal,
  newTotalRevenueUSD: BigDecimal,
  event: ethereum.Event
): void {
  const financialDailySnapshot = getOrCreateFinancials(event);

  financialDailySnapshot.dailyProtocolSideRevenueUSD =
    financialDailySnapshot.dailyProtocolSideRevenueUSD.plus(
      newProtocolSideRevenueUSD
    );
  financialDailySnapshot.dailySupplySideRevenueUSD =
    financialDailySnapshot.dailySupplySideRevenueUSD.plus(
      newSupplySideRevenueUSD
    );
  financialDailySnapshot.dailyTotalRevenueUSD =
    financialDailySnapshot.dailyTotalRevenueUSD.plus(newTotalRevenueUSD);
  financialDailySnapshot.save();
}

export function getProtocolHourlyId(
  block: ethereum.Block,
  protocol: YieldAggregator
): string {
  const daysSinceEpoch = getHoursSinceEpoch(block.timestamp.toI32());
  const id = protocol.id.concat("-").concat(daysSinceEpoch.toString());
  return id;
}

export function updateUsageMetricsDailySnapshot(
  event: ethereum.Event,
  protocol: YieldAggregator,
  deposit: boolean,
  withdraw: boolean
): UsageMetricsDailySnapshot {
  const id = getDaysSinceEpoch(event.block.timestamp.toI32()).toString();
  let protocolDailySnapshot = UsageMetricsDailySnapshot.load(id);
  if (protocolDailySnapshot == null) {
    protocolDailySnapshot = new UsageMetricsDailySnapshot(id);
    protocolDailySnapshot.protocol = protocol.id;
    protocolDailySnapshot.dailyActiveUsers = isNewDailyActiveUser(
      event.transaction.from,
      event.block
    );
    protocolDailySnapshot.cumulativeUniqueUsers =
      protocol.cumulativeUniqueUsers;
    protocolDailySnapshot.dailyTransactionCount =
      deposit || withdraw ? BIGINT_ONE : BIGINT_ZERO;
    protocolDailySnapshot.dailyDepositCount = deposit
      ? BIGINT_ONE
      : BIGINT_ZERO;
    protocolDailySnapshot.dailyWithdrawCount = withdraw
      ? BIGINT_ONE
      : BIGINT_ZERO;
    protocolDailySnapshot.blockNumber = event.block.number;
    protocolDailySnapshot.timestamp = event.block.timestamp;
    protocolDailySnapshot.save();
  } else {
    protocolDailySnapshot.dailyActiveUsers =
      protocolDailySnapshot.dailyActiveUsers.plus(
        isNewDailyActiveUser(event.transaction.from, event.block)
      );
    protocolDailySnapshot.cumulativeUniqueUsers =
      protocol.cumulativeUniqueUsers;
    protocolDailySnapshot.dailyTransactionCount =
      deposit || withdraw
        ? protocolDailySnapshot.dailyTransactionCount.plus(BIGINT_ONE)
        : protocolDailySnapshot.dailyTransactionCount;
    protocolDailySnapshot.dailyDepositCount = deposit
      ? protocolDailySnapshot.dailyDepositCount.plus(BIGINT_ONE)
      : protocolDailySnapshot.dailyDepositCount;
    protocolDailySnapshot.dailyWithdrawCount = withdraw
      ? protocolDailySnapshot.dailyWithdrawCount.plus(BIGINT_ONE)
      : protocolDailySnapshot.dailyWithdrawCount;
    protocolDailySnapshot.blockNumber = event.block.number;
    protocolDailySnapshot.timestamp = event.block.timestamp;
    protocolDailySnapshot.save();
  }

  return protocolDailySnapshot;
}

export function updateUsageMetricsHourlySnapshot(
  event: ethereum.Event,
  protocol: YieldAggregator,
  deposit: boolean,
  withdraw: boolean
): UsageMetricsHourlySnapshot {
  const id = getProtocolHourlyId(event.block, protocol);
  let protocolHourlySnapshot = UsageMetricsHourlySnapshot.load(id);
  if (protocolHourlySnapshot == null) {
    protocolHourlySnapshot = new UsageMetricsHourlySnapshot(id);
    protocolHourlySnapshot.protocol = protocol.id;
    protocolHourlySnapshot.hourlyActiveUsers = isNewHourlyActiveUser(
      event.transaction.from,
      event.block
    );
    protocolHourlySnapshot.cumulativeUniqueUsers =
      protocol.cumulativeUniqueUsers;
    protocolHourlySnapshot.hourlyTransactionCount =
      deposit || withdraw ? BIGINT_ONE : BIGINT_ZERO;
    protocolHourlySnapshot.hourlyDepositCount = deposit
      ? BIGINT_ONE
      : BIGINT_ZERO;
    protocolHourlySnapshot.hourlyWithdrawCount = withdraw
      ? BIGINT_ONE
      : BIGINT_ZERO;
    protocolHourlySnapshot.blockNumber = event.block.number;
    protocolHourlySnapshot.timestamp = event.block.timestamp;
    protocolHourlySnapshot.save();
  } else {
    protocolHourlySnapshot.hourlyActiveUsers =
      protocolHourlySnapshot.hourlyActiveUsers.plus(
        isNewHourlyActiveUser(event.transaction.from, event.block)
      );
    protocolHourlySnapshot.cumulativeUniqueUsers =
      protocol.cumulativeUniqueUsers;
    protocolHourlySnapshot.hourlyTransactionCount =
      deposit || withdraw
        ? protocolHourlySnapshot.hourlyTransactionCount.plus(BIGINT_ONE)
        : protocolHourlySnapshot.hourlyTransactionCount;
    protocolHourlySnapshot.hourlyDepositCount = deposit
      ? protocolHourlySnapshot.hourlyDepositCount.plus(BIGINT_ONE)
      : protocolHourlySnapshot.hourlyDepositCount;
    protocolHourlySnapshot.hourlyWithdrawCount = withdraw
      ? protocolHourlySnapshot.hourlyWithdrawCount.plus(BIGINT_ONE)
      : protocolHourlySnapshot.hourlyWithdrawCount;
    protocolHourlySnapshot.blockNumber = event.block.number;
    protocolHourlySnapshot.timestamp = event.block.timestamp;
    protocolHourlySnapshot.save();
  }

  return protocolHourlySnapshot;
}

export function updateDailyFinancialSnapshot(
  block: ethereum.Block,
  protocol: YieldAggregator
): FinancialsDailySnapshot {
  const id = getDaysSinceEpoch(block.timestamp.toI32()).toString();
  let dailyFinancialSnapshot = FinancialsDailySnapshot.load(id);
  if (!dailyFinancialSnapshot) {
    dailyFinancialSnapshot = createDailyFinancialSnapshot(block, protocol);
  }

  dailyFinancialSnapshot.totalValueLockedUSD = protocol.totalValueLockedUSD;
  dailyFinancialSnapshot.cumulativeSupplySideRevenueUSD =
    protocol.cumulativeSupplySideRevenueUSD;
  dailyFinancialSnapshot.cumulativeProtocolSideRevenueUSD =
    protocol.cumulativeProtocolSideRevenueUSD;
  dailyFinancialSnapshot.cumulativeTotalRevenueUSD =
    protocol.cumulativeTotalRevenueUSD;

  const previousSnapshot = findPreviousFinancialSnapshot(block);
  if (previousSnapshot) {
    dailyFinancialSnapshot.dailySupplySideRevenueUSD =
      protocol.cumulativeSupplySideRevenueUSD.minus(
        previousSnapshot.cumulativeSupplySideRevenueUSD
      );
    dailyFinancialSnapshot.dailyProtocolSideRevenueUSD =
      protocol.cumulativeProtocolSideRevenueUSD.minus(
        previousSnapshot.cumulativeProtocolSideRevenueUSD
      );
    dailyFinancialSnapshot.dailyTotalRevenueUSD =
      protocol.cumulativeTotalRevenueUSD.minus(
        previousSnapshot.cumulativeTotalRevenueUSD
      );
  } else {
    dailyFinancialSnapshot.dailySupplySideRevenueUSD =
      protocol.cumulativeSupplySideRevenueUSD;
    dailyFinancialSnapshot.dailyProtocolSideRevenueUSD =
      protocol.cumulativeProtocolSideRevenueUSD;
    dailyFinancialSnapshot.dailyTotalRevenueUSD =
      protocol.cumulativeTotalRevenueUSD;
  }

  dailyFinancialSnapshot.blockNumber = block.number;
  dailyFinancialSnapshot.timestamp = block.timestamp;

  dailyFinancialSnapshot.save();
  return dailyFinancialSnapshot;
}

export function createDailyFinancialSnapshot(
  block: ethereum.Block,
  protocol: YieldAggregator
): FinancialsDailySnapshot {
  const id = getDaysSinceEpoch(block.timestamp.toI32()).toString();
  const dailyFinancialSnapshot = new FinancialsDailySnapshot(id);
  dailyFinancialSnapshot.protocol = protocol.id;
  dailyFinancialSnapshot.totalValueLockedUSD = protocol.totalValueLockedUSD;

  dailyFinancialSnapshot.dailySupplySideRevenueUSD = BIGDECIMAL_ZERO;
  dailyFinancialSnapshot.dailyProtocolSideRevenueUSD = BIGDECIMAL_ZERO;
  dailyFinancialSnapshot.dailyTotalRevenueUSD = BIGDECIMAL_ZERO;

  dailyFinancialSnapshot.cumulativeSupplySideRevenueUSD = BIGDECIMAL_ZERO;
  dailyFinancialSnapshot.cumulativeProtocolSideRevenueUSD = BIGDECIMAL_ZERO;
  dailyFinancialSnapshot.cumulativeTotalRevenueUSD = BIGDECIMAL_ZERO;

  dailyFinancialSnapshot.blockNumber = block.number;
  dailyFinancialSnapshot.timestamp = block.timestamp;

  dailyFinancialSnapshot.save();
  return dailyFinancialSnapshot;
}

function isNewDailyActiveUser(user: Address, block: ethereum.Block): BigInt {
  const id =
    "daily-" +
    user.toHexString() +
    getDaysSinceEpoch(block.timestamp.toI32()).toString();
  let userEntity = ActiveUser.load(id);
  if (userEntity == null) {
    userEntity = new ActiveUser(id);
    userEntity.save();
    return BIGINT_ONE;
  } else {
    return BIGINT_ZERO;
  }
}

function isNewHourlyActiveUser(user: Address, block: ethereum.Block): BigInt {
  const id =
    "hourly-" +
    user.toHexString() +
    getHoursSinceEpoch(block.timestamp.toI32()).toString();
  let userEntity = ActiveUser.load(id);
  if (userEntity == null) {
    userEntity = new ActiveUser(id);
    userEntity.save();
    return BIGINT_ONE;
  } else {
    return BIGINT_ZERO;
  }
}

function findPreviousFinancialSnapshot(
  block: ethereum.Block
): FinancialsDailySnapshot | null {
  let day = getDaysSinceEpoch(block.timestamp.toI32()) - 1;
  let previousSnapshot = FinancialsDailySnapshot.load(day.toString());
  while (!previousSnapshot && day > 0) {
    day--;
    previousSnapshot = FinancialsDailySnapshot.load(day.toString());
  }
  return previousSnapshot;
}
