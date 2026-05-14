create extension if not exists pgcrypto;

create table if not exists public.admin_users (
  user_id uuid primary key references public.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('super_admin', 'admin', 'editor', 'reviewer', 'operator')),
  is_active boolean not null default true,
  display_name text,
  permissions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  setting_key text primary key,
  setting_group text not null default 'general',
  label text not null,
  value jsonb not null default '{}'::jsonb,
  description text,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_mode_configs (
  mode_key text primary key,
  mode_name text not null,
  provider text not null default 'custom',
  endpoint_url text not null,
  api_key_env text not null,
  model text not null,
  system_prompt text not null,
  is_enabled boolean not null default true,
  extra_payload jsonb not null default '{}'::jsonb,
  updated_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text not null,
  target_type text not null default 'all' check (target_type in ('all', 'users', 'admins')),
  target_user_ids uuid[] not null default '{}'::uuid[],
  status text not null default 'draft' check (status in ('draft', 'sent')),
  sent_at timestamptz,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_notifications (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  is_read boolean not null default false,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  unique(notification_id, user_id)
);

alter table public.community_posts
  add column if not exists reviewed_by uuid references public.users(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists moderation_stage text not null default 'rule' check (moderation_stage in ('rule', 'ai', 'fallback', 'manual')),
  add column if not exists is_featured boolean not null default false,
  add column if not exists moderation_detail jsonb not null default '{}'::jsonb;

alter table public.users
  add column if not exists nickname text,
  add column if not exists status text not null default 'active' check (status in ('active', 'disabled')),
  add column if not exists last_login_at timestamptz,
  add column if not exists avatar_url text,
  add column if not exists notes text;

create index if not exists admin_users_role_idx
  on public.admin_users (role);

create index if not exists notifications_status_created_idx
  on public.notifications (status, created_at desc);

create index if not exists user_notifications_user_created_idx
  on public.user_notifications (user_id, created_at desc);

create index if not exists community_posts_status_reviewed_idx
  on public.community_posts (moderation_status, reviewed_at desc);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_admin_users_updated_at on public.admin_users;
create trigger trg_admin_users_updated_at
before update on public.admin_users
for each row
execute function public.touch_updated_at();

drop trigger if exists trg_site_settings_updated_at on public.site_settings;
create trigger trg_site_settings_updated_at
before update on public.site_settings
for each row
execute function public.touch_updated_at();

drop trigger if exists trg_ai_mode_configs_updated_at on public.ai_mode_configs;
create trigger trg_ai_mode_configs_updated_at
before update on public.ai_mode_configs
for each row
execute function public.touch_updated_at();

drop trigger if exists trg_notifications_updated_at on public.notifications;
create trigger trg_notifications_updated_at
before update on public.notifications
for each row
execute function public.touch_updated_at();

insert into public.site_settings (setting_key, setting_group, label, value, description)
values
  (
    'brand.homepage.hero',
    'homepage',
    '首页首屏',
    '{
      "title": "小红车魔法工坊",
      "subtitle": "共同拥抱AI新时代",
      "description": "把编程、绘画、写作与未来科技体验，变成孩子愿意主动走进去的创造旅程。",
      "primaryButtonLabel": "开始第一场创作旅程",
      "primaryButtonHref": "/workshop?mode=coding",
      "secondaryBadge": "面向孩子的AI创造力启蒙"
    }'::jsonb,
    '首页首屏标题、副标题和按钮文案'
  ),
  (
    'brand.identity',
    'brand',
    '品牌基础信息',
    '{
      "siteName": "小红车魔法工坊",
      "tagline": "下一代儿童AI创造力平台",
      "logoUrl": "/logo.png"
    }'::jsonb,
    '站点名称、标语和 Logo 地址'
  ),
  (
    'credits.policy',
    'credits',
    '魔法币策略',
    '{
      "initialCredits": 50
    }'::jsonb,
    '新用户初始赠送的魔法币数量'
  ),
  (
    'brand.page.summary',
    'brand',
    '品牌页摘要',
    '{
      "title": "我们想打造的不是工具站",
      "highlight": "而是一座儿童创造宇宙",
      "description": "小红车魔法工坊相信，真正好的 AI 教育平台，不该先要求孩子适应技术，而应该先让技术适应孩子的好奇心、表达欲、想象力与创造力。"
    }'::jsonb,
    '品牌页头图文案'
  )
on conflict (setting_key) do nothing;

insert into public.ai_mode_configs (
  mode_key,
  mode_name,
  provider,
  endpoint_url,
  api_key_env,
  model,
  system_prompt,
  is_enabled,
  extra_payload
)
values
  (
    'coding',
    'AI编程',
    'mimo',
    'https://token-plan-cn.xiaomimimo.com/v1/chat/completions',
    'AI_API_KEY',
    'mimo-v2.5-pro',
    '你是一个充满童心的少儿编程导师和前端魔法师。请根据用户输入的魔法咒语，生成一个可以在浏览器直接运行的单文件 HTML 代码。里面必须包含必要的 CSS，并通过 CDN 引入 Tailwind CSS，还要包含 JavaScript 交互。界面风格要可爱、充满童趣，宽度必须 100% 适配手机屏幕。核心要求：生成的页面内容如果较长，必须允许用户垂直滑动浏览。绝对禁止在 body 或 html 标签上使用 overflow: hidden 或固定 100vh 高度从而阻断用户滚动。重要要求：只返回纯 HTML 代码，绝对不要包含任何 Markdown 格式符号，也不要任何解释性文字。',
    true,
    '{"creditEnabled":false,"creditCost":0}'::jsonb
  ),
  (
    'writing',
    'AI写作',
    'mimo',
    'https://token-plan-cn.xiaomimimo.com/v1/chat/completions',
    'AI_API_KEY',
    'mimo-v2.5-pro',
    '你是一位充满童心、温柔又专业的少儿写作导师。请根据用户输入的写作需求，生成适合中小学生阅读和使用的中文写作内容。要求语言优美、生动、有画面感，同时保持自然、真诚、易懂。如果用户要童话，就写得温暖有想象力；如果用户要诗歌，就写得有节奏和意境；如果用户要演讲稿，就写得自信、清晰、有感染力。重要要求：只返回最终的纯文本内容，绝对不要包含 Markdown 代码块、标题符号、解释说明、创作分析或多余前后缀。',
    true,
    '{"creditEnabled":false,"creditCost":0}'::jsonb
  ),
  (
    'painting',
    'AI绘画',
    'siliconflow',
    'https://api.siliconflow.cn/v1/images/generations',
    'SILICONFLOW_API_KEY',
    'Kwai-Kolors/Kolors',
    '请根据用户输入的中文绘画描述，生成适合儿童教育展示的图像。',
    true,
    '{"image_size":"1024x1024","creditEnabled":true,"creditCost":5}'::jsonb
  ),
  (
    'transcribe',
    '语音识别',
    'siliconflow',
    'https://api.siliconflow.cn/v1/audio/transcriptions',
    'SILICONFLOW_API_KEY',
    'FunAudioLLM/SenseVoiceSmall',
    '请将儿童语音内容准确识别为简体中文文本。',
    true,
    '{"creditEnabled":false,"creditCost":0}'::jsonb
  )
on conflict (mode_key) do nothing;
