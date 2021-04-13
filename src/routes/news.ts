import { html, HTMLContent, HTMLResponse, unsafeHTML } from "@worker-tools/html";
import { notFound } from "@worker-tools/response-creators";
// import { formatDistanceToNowStrict } from 'date-fns';

import { RouteArgs, router } from "../router";
import { page } from './components';

import { stories, Post, Stories } from './api/provider'

const tryURL = (url: string): URL | null => {
  try { return new URL(url, self.location.origin); } catch { return null }
}

const stripWWW = (url?: URL | null) => {
  if (!url) return '';
  if (url.hostname.substr(0, 4) === 'www.') url.hostname = url.hostname.substr(4);
  if (['github.com', 'gitlab.com'].includes(url.hostname)) {
    const p = url.pathname.substr(1).replace(/\/+/g, '/').split('/');
    return url.hostname + '/' + p[0];
  }
  return url.hostname;
}

const rankEl = (index?: number) => html`
  <span class="rank">${index != null && !Number.isNaN(index) ? `${index + 1}.` : ''}</span>`;

export const aThing = ({ type, id, url, title }: Post, index?: number, op?: Stories) => {
  try {
    const uRL = tryURL(url);
    return html`
      <tr class="athing" id="${id}">
        <td align="right" valign="top" class="title">${rankEl(index)}</td>
        <td valign="top" class="votelinks"><center>${type === 'job'
          ? html`<img src="s.gif" height="1" width="14">`
          : html`<a id="up_${id}" onclick="return vote(event, this, &quot;up&quot;)"
              href="vote?id=${id}&amp;how=up&amp;auth=${'TODO'}&amp;goto=${op}">
              <div class="votearrow" title="upvote"></div>
            </a>`}</center></td>
        <td class="title"><a href="${url}"
            class="storylink">${title}</a>${uRL?.host === self.location.host ? '' : html`<span
            class="sitebit comhead"> (<a href="from?site=${uRL?.hostname}"><span
                class="sitestr">${stripWWW(uRL)}</span></a>)</span>`}</td>
      </tr>`;
  } catch (err) {
    throw html`<tr><td>Something went wrong</td><td>${err.message}</td></tr>`
  }
}

const subtext = ({ type, id, timeAgo: time_ago, score, by, descendants }: Post, _index?: number, op?: Stories) => {
  return html`
    <tr>
      <td colspan="2"></td>
      <td class="subtext">
        ${type !== 'job' 
          ? html`<span class="score" id="score_${id}">${score} points</span> by <a href="user?id=${by}" class="hnuser">${by}</a>`
          : ''}
        <span class="age"><a href="item?id=${id}">${time_ago}</a></span>
        <span id="unv_${id}"></span>
        <!-- | <a href="hide?id=${id}&amp;auth=${'TODO'}&amp;goto=${op}" onclick="return hidestory(event, this, ${id})">hide</a>  -->
        ${type !== 'job' 
          ? html`| <a href="item?id=${id}">${descendants === 0 
            ? 'discuss' 
            : unsafeHTML(`${descendants}&nbsp;comments`)}</a></td>`
          : ''}
    </tr>
  `;
}

const rowEl = (arg: Post, i: number, type: Stories) => {
  // FIXME: support other types
  return html`
    ${aThing(arg, i, type)}
    ${subtext(arg, i, type)}
    <tr class="spacer" style="height:5px"></tr>`;
}

const messageEl = (message: HTMLContent, marginBottom = 12) => html`
  <tr style="height:6px"></tr>
  <tr><td colspan="2"></td><td>${message}</td></tr>
  <tr style="height:${marginBottom}px"></tr>`;

const mkStories = (type: Stories) => ({ searchParams }: RouteArgs) => {
  const p = Number(searchParams.get('p') || '1');
  if (p > Math.ceil(500 / 30)) return notFound('Not supported by Edge HN');

  return new HTMLResponse(page({ op: type })(html`
    <tr id="pagespace" title="" style="height:10px"></tr>
    <tr>
      <td>
        <table border="0" cellpadding="0" cellspacing="0" class="itemlist">
          <tbody>
            ${type === Stories.SHOW ? messageEl(html`
              Please read the <a href="showhn.html"><u>rules</u></a>. You can also
              browse the <a href="shownew"><u>newest</u></a> Show HNs.`) : ''}
            ${type === Stories.JOB ? messageEl(html`
              These are jobs at YC startups. See more at
              <a href="https://www.ycombinator.com/jobs"><u>ycombinator.com/jobs</u></a>.`, 14) : ''}
            ${async function* () {
              try {
                let i = (p - 1) * 30;
                for await (const post of stories(p, type)) 
                  yield rowEl(post, type !== Stories.JOB ? i++ : NaN, type);
              } catch (err) {
                yield html`<tr><td colspan="2"></td><td>${err.message}</td></tr>`;
              }
            }}
            <tr class="morespace" style="height:10px"></tr>
            <tr>
              <td colspan="2"></td>
              <td class="title"><a href="${type}?p=${p + 1}" class="morelink" rel="next">More</a></td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>`));
};

export const news = mkStories(Stories.TOP)
export const newest = mkStories(Stories.NEW)
export const best = mkStories(Stories.BEST)
export const show = mkStories(Stories.SHOW)
export const ask = mkStories(Stories.ASK)
export const jobs = mkStories(Stories.JOB)


router.get('/news', news);
router.get('/newest', newest);
router.get('/best', best);
router.get('/show', show);
router.get('/ask', ask);
router.get('/jobs', jobs);
