import { NextResponse } from "next/server";
import {
  requireAdminContext,
  requirePermission,
} from "@/lib/admin";
import { appendAdminAuditLog } from "@/lib/admin-audit";
import {
  createActivationCodeBatch,
  deleteSubscriptionPlan,
  getMagicCoinRate,
  listActivationCodeBatches,
  listActivationCodesByBatch,
  listAdminPaymentOrders,
  listSubscriptionPlans,
  updateMagicCoinRate,
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

    const [rate, plans, orders, batches] = await Promise.all([
      getMagicCoinRate(),
      listSubscriptionPlans({ includeInactive: true }),
      listAdminPaymentOrders(),
      listActivationCodeBatches(),
    ]);

    return NextResponse.json({
      rate,
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

      return NextResponse.json({ success: true, rate });
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
