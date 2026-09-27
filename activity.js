// Only aggregate duration, local calendar dates, random session IDs and language.
function activityDay(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function addActivity(data, sample, since = 0, now = Date.now()) {
  if (!Number.isFinite(sample.from) || !Number.isFinite(sample.to) || sample.to <= sample.from || sample.to > now + 1000 || sample.to - sample.from > 30000) return data;
  if (!/^[a-zA-Z0-9-]{1,80}$/.test(sample.id) || !/^[a-zA-Z-]{2,12}$/.test(sample.language)) return data;
  let cursor = Math.max(sample.from, since);
  while (cursor < sample.to) {
    const date = new Date(cursor), key = activityDay(date);
    const midnight = new Date(date); midnight.setHours(24, 0, 0, 0);
    const end = Math.min(sample.to, midnight.getTime());
    const day = data[key] || {seconds: 0, languages: {}, sessions: []};
    const seconds = (end - cursor) / 1000;
    day.seconds += seconds;
    day.languages[sample.language] = (day.languages[sample.language] || 0) + seconds;
    if (!day.sessions.includes(sample.id)) day.sessions.push(sample.id);
    data[key] = day; cursor = end;
  }
  const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - 365);
  const firstDay = activityDay(cutoff);
  for (const key of Object.keys(data)) if (key < firstDay) delete data[key];
  return data;
}
if (typeof module !== 'undefined') module.exports = {activityDay, addActivity};
