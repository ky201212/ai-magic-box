import { NextResponse } from "next/server";
import {
  requireAdminContext,
  requirePermission,
} from "@/lib/admin";
import { appendAdminAuditLog } from "@/lib/admin-audit";
import { appendSecurityEventLog } from "@/lib/security-audit";
import {
  createActivationCodeBatch,
  deleteCoinRechargePackage,
  deleteSubscriptionPlan,
  fulfillPaymentOrder,
  getMagicCoinRate,
  listActivationCodeBatches,
  listActivationCodesByBatch,
  listCoinRechargePackages,
  listAdminPaymentOrders,
  listSubscriptionPlans,
  refundPaymentOrder,
  syncPaymentOrderFromGateway,
  updateMagicCoinRate,
  upsertCoinRechargePackage,
  upsertSubscriptionPlan,
} from "@/lib/payments";

export async function GET(request: Request) {
  const { error, adminContext } = await requireAdminContext();

  if (error || !adminContext) {
    return error;
  }

  const permissionError = requirePermission(adminContext, "site_settings");

  if (permissionError) {
    return permissionError;
  }

  try {
    const batchId = new URL(request.url).searchParams.get("batchId");

    if (batchId) {
      const codes = await listActivationCodesByBatch(batchId);
      return NextResponse.json({ codes });
    }

    const [rate, packages, plans, orders, batches] = await Promise.all([
      getMagicCoinRate(),
      listCoinRechargePackages({ includeInactive: true }),
      listSubscriptionPlans({ includeInactive: true }),
      listAdminPaymentOrders(),
      listActivationCodeBatches(),
    ]);

    return NextResponse.json({
      rate,
      packages,
      plans,
      orders,
      batches,
    });
  } catch (requestError) {
    console.error("【后台支付管理读取失败】:", requestError);
    return NextResponse.json(
      { error: "支付管理数据读取失败，请稍后再试。" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const { error, adminContext } = await requireAdminContext();

  if (error || !adminContext) {
    return error;
  }

  const permissionError = requirePermission(adminContext, "site_settings");

  if (permissionError) {
    return permissionError;
  }

  try {
    const body = (await request.json()) as
      | {
          action: "update_rate";
          coinPerYuan: number;
        }
      | {
          action: "upsert_coin_package";
          package: {
            id?: string;
            name: string;
            coins: number;
            price: number;
            sortOrder: number;
            isActive: boolean;
          };
        }
      | {
          action: "delete_coin_package";
          packageId: string;
        }
      | {
          action: "upsert_plan";
          plan: {
            id?: string;
            name: string;
            dailyCoins: number;
            durationDays: number;
            refreshTime: string;
            price: number;
            isActive: boolean;
          };
        }
      | {
          action: "create_activation_batch";
          batch: {
            name: string;
            type: "coin" | "subscription";
            value: string;
            quantity: number;
            expireAt?: string | null;
          };
        }
      | {
          action: "delete_plan";
          planId: string;
        }
      | {
          action: "sync_order";
          orderId: string;
        }
      | {
          action: "fulfill_order";
          orderId: string;
        }
      | {
          action: "refund_order";
          orderId: string;
          reason?: string;
        };

    if (body.action === "update_rate") {
      const rate = await updateMagicCoinRate(body.coinPerYuan, adminContext.userId);

      await appendAdminAuditLog({
        actorUserId: adminContext.userId,
        actorDisplayName: adminContext.displayName,
        actorPhone: adminContext.phone,
        action: "payment_rate_update",
        targetType: "magic_coin_rate",
        targetId: "singleton",
        detail: {
          coinPerYuan: rate.coin_per_yuan,
        },
      });

      await appendSecurityEventLog({
        request,
        userId: adminContext.userId,
        eventType: "admin_payment",
        action: "update_magic_coin_rate",
        accountIdentifier: adminContext.phone,
        detail: {
          coinPerYuan: rate.coin_per_yuan,
        },
      }).catch((auditError) => {
        console.error("【支付汇率安全日志写入失败】:", auditError);
      });

      return NextResponse.json({ success: true, rate });
    }

    if (body.action === "upsert_coin_package") {
      const packageRecord = await upsertCoinRechargePackage(body.package);

      await appendAdminAuditLog({
        actorUserId: adminContext.userId,
        actorDisplayName: adminContext.displayName,
        actorPhone: adminContext.phone,
        action: "coin_recharge_package_upsert",
        targetType: "coin_recharge_package",
        targetId: packageRecord.id,
        detail: {
          name: packageRecord.name,
          coins: packageRecord.coins,
          price: packageRecord.price,
          isActive: packageRecord.is_active,
        },
      });

      await appendSecurityEventLog({
        request,
        userId: adminContext.userId,
        eventType: "admin_payment",
        action: "upsert_coin_recharge_package",
        accountIdentifier: adminContext.phone,
        detail: {
          packageId: packageRecord.id,
          coins: packageRecord.coins,
          price: packageRecord.price,
        },
      }).catch((auditError) => {
        console.error("【充值档位安全日志写入失败】:", auditError);
      });

      return NextResponse.json({
        success: true,
        package: packageRecord,
      });
    }

    if (body.action === "delete_coin_package") {
      const packageRecord = await deleteCoinRechargePackage(body.packageId);

      await appendAdminAuditLog({
        actorUserId: adminContext.userId,
        actorDisplayName: adminContext.displayName,
        actorPhone: adminContext.phone,
        action: "coin_recharge_package_delete",
        targetType: "coin_recharge_package",
        targetId: packageRecord.id,
        detail: {
          name: packageRecord.name,
        },
      });

      await appendSecurityEventLog({
        request,
        userId: adminContext.userId,
        eventType: "admin_payment",
        action: "delete_coin_recharge_package",
        accountIdentifier: adminContext.phone,
        detail: {
          packageId: packageRecord.id,
        },
      }).catch((auditError) => {
        console.error("【删除充值档位安全日志写入失败】:", auditError);
      });

      return NextResponse.json({
        success: true,
        package: packageRecord,
      });
    }

    if (body.action === "upsert_plan") {
      const plan = await upsertSubscriptionPlan(body.plan);

      await appendAdminAuditLog({
        actorUserId: adminContext.userId,
        actorDisplayName: adminContext.displayName,
        actorPhone: adminContext.phone,
        action: "subscription_plan_upsert",
        targetType: "subscription_plan",
        targetId: plan.id,
        detail: {
          name: plan.name,
          dailyCoins: plan.daily_coins,
          durationDays: plan.duration_days,
          price: plan.price,
          isActive: plan.is_active,
        },
      });

      return NextResponse.json({ success: true, plan });
    }

    if (body.action === "create_activation_batch") {
      const result = await createActivationCodeBatch({
        ...body.batch,
        createdBy: adminContext.userId,
      });

      await appendAdminAuditLog({
        actorUserId: adminContext.userId,
        actorDisplayName: adminContext.displayName,
        actorPhone: adminContext.phone,
        action: "activation_batch_create",
        targetType: "activation_batch",
        targetId: result.batch.id,
        detail: {
          type: result.batch.code_type,
          value: result.batch.value,
          quantity: result.batch.quantity,
        },
      });

      return NextResponse.json({
        success: true,
        batch: result.batch,
        plaintextCodes: result.plaintextCodes,
      });
    }

    if (body.action === "delete_plan") {
      const plan = await deleteSubscriptionPlan(body.planId);

      await appendAdminAuditLog({
        actorUserId: adminContext.userId,
        actorDisplayName: adminContext.displayName,
        actorPhone: adminContext.phone,
        action: "subscription_plan_delete",
        targetType: "subscription_plan",
        targetId: plan.id,
        detail: {
          name: plan.name,
        },
      });

      return NextResponse.json({
        success: true,
        plan,
      });
    }

    if (body.action === "sync_order") {
      const order = await syncPaymentOrderFromGateway(body.orderId);

      await appendAdminAuditLog({
        actorUserId: adminContext.userId,
        actorDisplayName: adminContext.displayName,
        actorPhone: adminContext.phone,
        action: "payment_order_sync",
        targetType: "payment_order",
        targetId: order.order_id,
        detail: {
          status: order.status,
          tradeNo: order.trade_no,
          notifyStatus: order.notify_status,
        },
      });

      return NextResponse.json({
        success: true,
        order,
      });
    }

    if (body.action === "fulfill_order") {
      const order = await fulfillPaymentOrder(body.orderId);

      await appendAdminAuditLog({
        actorUserId: adminContext.userId,
        actorDisplayName: adminContext.displayName,
        actorPhone: adminContext.phone,
        action: "payment_order_fulfill",
        targetType: "payment_order",
        targetId: order.order_id,
        detail: {
          status: order.status,
          fulfillmentStatus: order.fulfillment_status,
          fulfilledAt: order.fulfilled_at,
        },
      });

      return NextResponse.json({
        success: true,
        order,
      });
    }

    if (body.action === "refund_order") {
      const order = await refundPaymentOrder({
        orderId: body.orderId,
        reason: body.reason,
      });

      await appendAdminAuditLog({
        actorUserId: adminContext.userId,
        actorDisplayName: adminContext.displayName,
        actorPhone: adminContext.phone,
        action: "payment_order_refund",
        targetType: "payment_order",
        targetId: order.order_id,
        detail: {
          amount: order.amount,
          paymentMethod: order.payment_method,
          tradeNo: order.trade_no,
          reason: body.reason ?? null,
        },
      });

      return NextResponse.json({
        success: true,
        order,
      });
    }

    return NextResponse.json({ error: "不支持的操作。" }, { status: 400 });
  } catch (requestError) {
    console.error("【后台支付管理保存失败】:", requestError);
    return NextResponse.json(
      {
        error:
          requestError instanceof Error
            ? requestError.message
            : "支付管理保存失败，请稍后再试。",
      },
      { status: 500 },
    );
  }
}
