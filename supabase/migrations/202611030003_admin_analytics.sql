-- Events uniquement. Pas de changement aux réservations ni au stock.
begin;
create table public.events_analytics_events (
 environment text not null check(environment in ('test','live')),
 id uuid not null,
 session_id uuid not null,
 event_id text not null check(length(event_id) between 1 and 80),
 name text not null check(name in ('page_view','section_view','cta_click','screens_change','design_change','dates_change','cart_open','cart_update','cart_close','quote_open','quote_close','quote_prepared','email_open','summary_copy','checkout_attempt','begin_checkout','checkout_error','video_play','video_unmute','video_progress')),
 props jsonb not null default '{}' check(jsonb_typeof(props)='object' and octet_length(props::text)<=2048),
 created_at timestamptz not null default now(),
 primary key(environment,id)
);
create index events_analytics_period on public.events_analytics_events(environment,created_at,event_id);
create index events_analytics_session on public.events_analytics_events(environment,session_id,event_id,created_at);
create table public.events_request_limits (
 key_hash text primary key check(key_hash ~ '^[a-f0-9]{64}$'),
 bucket bigint not null,
 count integer not null check(count>0),
 updated_at timestamptz not null default now()
);
alter table public.events_analytics_events enable row level security;
alter table public.events_request_limits enable row level security;
revoke all on public.events_analytics_events,public.events_request_limits from public,anon,authenticated;
grant select,insert,delete on public.events_analytics_events to service_role;
grant select,insert,update,delete on public.events_request_limits to service_role;

create function public.events_allow_request(p_key_hash text,p_limit integer,p_window_seconds integer)
returns boolean language plpgsql security definer set search_path='' as $$
declare v_bucket bigint; v_count integer;
begin
 if p_key_hash is null or p_limit is null or p_window_seconds is null or p_key_hash !~ '^[a-f0-9]{64}$' or p_limit not between 1 and 500 or p_window_seconds not between 1 and 86400 then raise exception 'invalid_rate_limit'; end if;
 v_bucket:=floor(extract(epoch from clock_timestamp())/p_window_seconds);
 insert into public.events_request_limits as t(key_hash,bucket,count,updated_at) values(p_key_hash,v_bucket,1,clock_timestamp())
 on conflict(key_hash) do update set bucket=excluded.bucket,
 count=case when t.bucket=excluded.bucket then least(t.count+1,p_limit+1) else 1 end,updated_at=clock_timestamp()
 returning count into v_count;
 return v_count<=p_limit;
end $$;

create function public.events_analytics_report(p_environment text,p_since timestamptz,p_event_id text default null)
returns jsonb language sql stable security definer set search_path='' as $$
with filtered as (
 select * from public.events_analytics_events where environment=p_environment and created_at>=p_since and created_at<=now()
 and (p_event_id is null or event_id=p_event_id)
), totals as (
 select count(*) as events,count(*) filter(where name='page_view') as views,
 count(distinct session_id) as sessions from filtered
), funnel as (
 select name,count(*) as events,count(distinct session_id) as sessions from filtered group by name
), pages as (
 select event_id,count(*) filter(where name='page_view') as views,count(distinct session_id) as sessions from filtered group by event_id
), days as (
 select to_char(created_at at time zone 'America/Toronto','YYYY-MM-DD') as day,
 count(*) filter(where name='page_view') as views,count(distinct session_id) as sessions from filtered group by 1
), sources as (
 select coalesce(nullif(props->>'source',''),nullif(props->>'referrer',''),'direct') as source,
 coalesce(props->>'medium','') as medium,coalesce(props->>'campaign','') as campaign,
 count(*) as views,count(distinct session_id) as sessions from filtered where name='page_view' group by 1,2,3
), latest as (
 select distinct on(event_id,session_id) event_id,session_id,name,props,created_at from filtered
 where name in ('cart_open','cart_update','cart_close','quote_open','quote_close','quote_prepared','screens_change','design_change','dates_change','checkout_attempt','begin_checkout','checkout_error')
 order by event_id,session_id,created_at desc
), carts as (
 select event_id,left(session_id::text,8) as session_label,name,props,created_at from latest order by created_at desc limit 50
)
select jsonb_build_object(
 'totals',(select to_jsonb(t) from totals t),
 'funnel',coalesce((select jsonb_agg(to_jsonb(f) order by f.name) from funnel f),'[]'::jsonb),
 'pages',coalesce((select jsonb_agg(to_jsonb(p) order by p.views desc) from pages p),'[]'::jsonb),
 'days',coalesce((select jsonb_agg(to_jsonb(d) order by d.day) from days d),'[]'::jsonb),
 'sources',coalesce((select jsonb_agg(to_jsonb(s) order by s.views desc) from (select * from sources order by views desc limit 30) s),'[]'::jsonb),
 'carts',coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at desc) from carts c),'[]'::jsonb)
);
$$;

create function public.events_analytics_cleanup() returns void language sql security definer set search_path='' as $$
 delete from public.events_analytics_events where created_at<now()-interval '30 days';
 delete from public.events_request_limits where updated_at<now()-interval '1 day';
$$;
revoke all on function public.events_allow_request(text,integer,integer),public.events_analytics_report(text,timestamptz,text),public.events_analytics_cleanup() from public,anon,authenticated;
grant execute on function public.events_allow_request(text,integer,integer),public.events_analytics_report(text,timestamptz,text),public.events_analytics_cleanup() to service_role;
commit;
