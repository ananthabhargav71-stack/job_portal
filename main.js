// ---------- Helpers ----------
function esc(text) {
  const div = document.createElement('div');
  div.textContent = text ?? '';
  return div.innerHTML;
}

async function fetchJobs(params = {}) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch('/api/jobs?' + query);
  if (!res.ok) throw new Error('Failed to load jobs');
  return res.json();
}

function jobCard(job) {
  const tags = String(job.skills || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => `<span class="tag">${esc(s)}</span>`)
    .join('');

  return `
    <div class="job-card">
      <h3>${esc(job.job_title)}</h3>
      <p class="company">${esc(job.company)}</p>
      <p class="meta">📍 ${esc(job.location)} &nbsp;|&nbsp; 💰 ${esc(job.salary)}</p>
      <div class="tags">${tags}</div>
      <a href="job-details.html?id=${encodeURIComponent(job.job_id)}" class="btn">View Details</a>
    </div>`;
}

// ---------- Home page: featured jobs ----------
const featured = document.getElementById('featured-jobs');
if (featured) {
  fetchJobs({ limit: 3 })
    .then(jobs => {
      featured.innerHTML = jobs.length
        ? jobs.map(jobCard).join('')
        : '<p class="muted">No jobs available yet.</p>';
    })
    .catch(() => (featured.innerHTML = '<p class="muted">Could not load jobs.</p>'));
}

// ---------- Browse jobs page ----------
const jobsList = document.getElementById('jobs-list');
if (jobsList) {
  const form = document.getElementById('filter-form');
  const qInput = document.getElementById('q');
  const locInput = document.getElementById('location');
  const skillsInput = document.getElementById('skills');
  const count = document.getElementById('result-count');

  async function loadJobs() {
    try {
      const jobs = await fetchJobs({
        q: qInput.value.trim(),
        location: locInput.value.trim(),
        skills: skillsInput.value.trim()
      });
      count.textContent = `${jobs.length} job(s) found`;
      jobsList.innerHTML = jobs.length
        ? jobs.map(jobCard).join('')
        : '<p class="muted">No matching jobs found.</p>';
    } catch {
      jobsList.innerHTML = '<p class="muted">Could not load jobs.</p>';
    }
  }

  // Pre-fill from the home page search (?q=...&location=...)
  const urlParams = new URLSearchParams(window.location.search);
  qInput.value = urlParams.get('q') || '';
  locInput.value = urlParams.get('location') || '';

  form.addEventListener('submit', e => { e.preventDefault(); loadJobs(); });
  document.getElementById('reset-btn').addEventListener('click', () => {
    form.reset();
    loadJobs();
  });

  loadJobs();
}

// ---------- Job details page ----------
const detail = document.getElementById('job-details');
if (detail) {
  const id = new URLSearchParams(window.location.search).get('id');

  if (!id) {
    detail.innerHTML = '<p class="muted">No job selected.</p>';
  } else {
    fetch('/api/jobs/' + encodeURIComponent(id))
      .then(res => {
        if (!res.ok) throw new Error('Not found');
        return res.json();
      })
      .then(job => {
        const tags = String(job.skills || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean)
          .map(s => `<span class="tag">${esc(s)}</span>`)
          .join('');

        document.title = `${job.job_title} - JobHub`;
        detail.innerHTML = `
          <h1>${esc(job.job_title)}</h1>
          <p class="company muted">${esc(job.company)}</p>
          <div class="info">
            <p><strong>Location:</strong> ${esc(job.location)}</p>
            <p><strong>Salary:</strong> ${esc(job.salary)}</p>
            <p><strong>Required Skills:</strong></p>
            <div class="tags">${tags}</div>
          </div>
          <button class="btn" id="apply-btn">Apply Now</button>`;

        document.getElementById('apply-btn').addEventListener('click', () => {
          alert(`Your interest in "${job.job_title}" at ${job.company} has been noted!`);
        });
      })
      .catch(() => (detail.innerHTML = '<p class="muted">Job not found.</p>'));
  }
}

// ---------- Post job page ----------
const postForm = document.getElementById('post-job-form');
if (postForm) {
  const message = document.getElementById('form-message');

  postForm.addEventListener('submit', async e => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(postForm).entries());

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      const result = await res.json();

      if (res.ok) {
        message.textContent = '✅ Job posted successfully!';
        postForm.reset();
      } else {
        message.textContent = '❌ ' + (result.error || 'Something went wrong');
      }
    } catch {
      message.textContent = '❌ Could not connect to the server.';
    }
  });
}