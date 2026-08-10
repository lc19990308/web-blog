import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 7;
const RESULT_LIMIT = 10;
const TIME_ZONE = 'Asia/Shanghai';
const now = new Date();
const since = new Date(now.getTime() - WINDOW_DAYS * DAY_MS);
const today = dateInTimeZone(now);
const sinceDate = dateInTimeZone(since);
const week = getIsoWeek(today);
const target = path.join(process.cwd(), 'source', '_data', 'github-weekly.json');

try {
  const repositories = await fetchRepositories(sinceDate);
  const snapshot = {
    schemaVersion: 1,
    week,
    generatedAt: now.toISOString(),
    period: {
      start: sinceDate,
      end: today
    },
    sourceUrl: createSearchUrl(sinceDate),
    repositories: repositories.map((repository, index) => ({
      rank: index + 1,
      fullName: repository.full_name,
      url: repository.html_url,
      stars: repository.stargazers_count,
      language: repository.language || '未标注',
      description: compact(repository.description) || '仓库未提供简介。',
      createdAt: repository.created_at?.slice(0, 10) || null,
      license: repository.license?.spdx_id || repository.license?.name || null
    }))
  };

  await writeSnapshot(snapshot);
  console.log(`已更新 ${snapshot.repositories.length} 个项目的 GitHub 热榜数据：${target}`);
} catch (error) {
  const cached = await readCachedSnapshot();

  if (cached) {
    console.warn(`GitHub 数据更新失败，保留上次成功数据（${cached.generatedAt}）：${error.message}`);
  } else {
    throw error;
  }
}

async function fetchRepositories(createdSince) {
  const query = `created:>=${createdSince} fork:false archived:false`;
  const url = new URL('https://api.github.com/search/repositories');
  url.search = new URLSearchParams({
    q: query,
    sort: 'stars',
    order: 'desc',
    per_page: String(RESULT_LIMIT)
  }).toString();

  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'lc-notes-weekly-github'
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(20_000)
  });

  if (!response.ok) {
    throw new Error(`GitHub Search API 请求失败：${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload.items) || payload.items.length < RESULT_LIMIT) {
    throw new Error(`GitHub Search API 未返回完整的前 ${RESULT_LIMIT} 个近 7 天新建仓库。`);
  }

  return payload.items.slice(0, RESULT_LIMIT);
}

function createSearchUrl(createdSince) {
  const searchUrl = new URL('https://github.com/search');
  searchUrl.search = new URLSearchParams({
    q: `created:>=${createdSince} fork:false archived:false`,
    type: 'repositories',
    s: 'stars',
    o: 'desc'
  }).toString();

  return searchUrl.toString();
}

function getIsoWeek(date) {
  const [year, month, dayOfMonth] = date.split('-').map(Number);
  const value = new Date(Date.UTC(year, month - 1, dayOfMonth));
  const day = value.getUTCDay() || 7;
  value.setUTCDate(value.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(value.getUTCFullYear(), 0, 1));
  const weekNumber = Math.ceil(((value - yearStart) / DAY_MS + 1) / 7);
  return `${value.getUTCFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

function compact(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
}

function dateInTimeZone(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

  return `${values.year}-${values.month}-${values.day}`;
}

async function writeSnapshot(snapshot) {
  await mkdir(path.dirname(target), { recursive: true });
  const temporaryTarget = `${target}.tmp`;
  await writeFile(temporaryTarget, `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8');
  await rename(temporaryTarget, target);
}

async function readCachedSnapshot() {
  try {
    const snapshot = JSON.parse(await readFile(target, 'utf8'));
    return Array.isArray(snapshot.repositories) && snapshot.repositories.length >= RESULT_LIMIT ? snapshot : null;
  } catch {
    return null;
  }
}
