<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { ApiError, createProject, deleteProject, getProjects, updateProject } from "@/services/api";
import type { Project } from "@/types/analysis";

const emit = defineEmits<{ analyzeProject: [projectId: string] }>();

const projects = ref<Project[]>([]);
const loading = ref(true);
const error = ref("");
const saving = ref(false);
const showForm = ref(false);

const form = reactive({
  name: "",
  description: "",
  repoFullName: "",
  repoUrl: "",
  language: "typescript",
  defaultBranch: "main",
  visibility: "private"
});

const editingId = ref<string | null>(null);
const editForm = reactive({ name: "", description: "", language: "", defaultBranch: "", visibility: "private" });

onMounted(loadProjects);

async function loadProjects(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    projects.value = await getProjects();
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : "Failed to load projects.";
  } finally {
    loading.value = false;
  }
}

async function submit(): Promise<void> {
  if (!form.name.trim()) {
    error.value = "Project name is required.";
    return;
  }

  saving.value = true;
  error.value = "";
  try {
    await createProject({
      name: form.name.trim(),
      description: form.description.trim() || null,
      repoFullName: form.repoFullName.trim() || null,
      repoUrl: form.repoUrl.trim() || null,
      language: form.language.trim() || null,
      defaultBranch: form.defaultBranch.trim() || "main",
      visibility: form.visibility
    });
    form.name = "";
    form.description = "";
    form.repoFullName = "";
    form.repoUrl = "";
    showForm.value = false;
    await loadProjects();
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : "Failed to create the project.";
  } finally {
    saving.value = false;
  }
}

function startEdit(project: Project): void {
  editingId.value = project.id;
  editForm.name = project.name;
  editForm.description = project.description ?? "";
  editForm.language = project.language ?? "";
  editForm.defaultBranch = project.defaultBranch;
  editForm.visibility = project.visibility;
}

async function saveEdit(projectId: string): Promise<void> {
  saving.value = true;
  error.value = "";
  try {
    await updateProject(projectId, {
      name: editForm.name.trim(),
      description: editForm.description.trim() || null,
      language: editForm.language.trim() || null,
      defaultBranch: editForm.defaultBranch.trim() || "main",
      visibility: editForm.visibility
    });
    editingId.value = null;
    await loadProjects();
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : "Failed to update the project.";
  } finally {
    saving.value = false;
  }
}

async function remove(projectId: string): Promise<void> {
  if (!confirm("Delete this project? Its analyses stay in your history but lose the project link.")) return;

  try {
    await deleteProject(projectId);
    await loadProjects();
  } catch (caught) {
    error.value = caught instanceof ApiError ? caught.message : "Failed to delete the project.";
  }
}

function scoreClass(score: number | null): string {
  if (score === null) return "";
  if (score >= 80) return "good";
  if (score >= 60) return "warning";
  return "poor";
}

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleDateString() : "never";
}
</script>

<template>
  <main class="repositories">
    <div class="toolbar">
      <p class="muted">{{ projects.length }} project{{ projects.length === 1 ? "" : "s" }} tracked</p>
      <button class="primary" @click="showForm = !showForm">{{ showForm ? "Cancel" : "＋ New project" }}</button>
    </div>

    <p v-if="error" class="error" role="alert">{{ error }}</p>

    <form v-if="showForm" class="panel form" @submit.prevent="submit">
      <h2>Add a repository</h2>
      <div class="form-grid">
        <label>Name <input v-model="form.name" placeholder="payments-service" required /></label>
        <label>GitHub repo <input v-model="form.repoFullName" placeholder="owner/repo" /></label>
        <label class="wide">Description <input v-model="form.description" placeholder="What this repository does" /></label>
        <label>Repository URL <input v-model="form.repoUrl" placeholder="https://github.com/owner/repo" /></label>
        <label>Primary language
          <select v-model="form.language">
            <option value="javascript">JavaScript</option>
            <option value="typescript">TypeScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="go">Go</option>
            <option value="other">Other</option>
          </select>
        </label>
        <label>Default branch <input v-model="form.defaultBranch" placeholder="main" /></label>
        <label>Visibility
          <select v-model="form.visibility">
            <option value="private">Private</option>
            <option value="public">Public</option>
          </select>
        </label>
      </div>
      <button type="submit" class="primary" :disabled="saving">{{ saving ? "Saving…" : "Create project" }}</button>
    </form>

    <div v-if="loading" class="loading">Loading repositories…</div>

    <div v-else-if="projects.length === 0" class="empty panel">
      <p>No projects yet.</p>
      <p class="muted">Create a project to group analyses by repository and track quality over time.</p>
    </div>

    <div v-else class="project-grid">
      <article v-for="project in projects" :key="project.id" class="panel project-card">
        <template v-if="editingId === project.id">
          <div class="form-grid">
            <label>Name <input v-model="editForm.name" /></label>
            <label>Language <input v-model="editForm.language" /></label>
            <label class="wide">Description <input v-model="editForm.description" /></label>
            <label>Default branch <input v-model="editForm.defaultBranch" /></label>
            <label>Visibility
              <select v-model="editForm.visibility">
                <option value="private">Private</option>
                <option value="public">Public</option>
              </select>
            </label>
          </div>
          <div class="card-actions">
            <button class="primary" :disabled="saving" @click="saveEdit(project.id)">Save</button>
            <button class="secondary" @click="editingId = null">Cancel</button>
          </div>
        </template>

        <template v-else>
          <header class="card-header">
            <div>
              <h2>{{ project.name }}</h2>
              <p class="muted">
                {{ project.repoFullName || "local project" }}
                <template v-if="project.language"> · {{ project.language }}</template>
                · {{ project.visibility }}
              </p>
            </div>
            <span class="score" :class="scoreClass(project.averageScore)">
              {{ project.averageScore === null ? "—" : project.averageScore }}
            </span>
          </header>

          <p v-if="project.description" class="description">{{ project.description }}</p>

          <dl class="meta">
            <div><dt>Analyses</dt><dd>{{ project.reportCount }}</dd></div>
            <div><dt>Last analysed</dt><dd>{{ formatDate(project.lastAnalyzedAt) }}</dd></div>
            <div><dt>Branch</dt><dd>{{ project.defaultBranch }}</dd></div>
          </dl>

          <div class="card-actions">
            <button class="primary" @click="emit('analyzeProject', project.id)">Analyze</button>
            <a v-if="project.repoUrl" class="secondary link" :href="project.repoUrl" target="_blank" rel="noreferrer">Open repo</a>
            <button class="secondary" @click="startEdit(project)">Edit</button>
            <button class="danger" @click="remove(project.id)">Delete</button>
          </div>
        </template>
      </article>
    </div>
  </main>
</template>

<style scoped>
.repositories { display: grid; gap: 1rem; }
.toolbar { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.muted { color: #94a3b8; font-size: 0.85rem; margin: 0; }
.error { color: #fca5a5; }
.loading { color: #94a3b8; padding: 3rem; text-align: center; }
.panel { background: rgba(23, 32, 51, 0.85); border: 1px solid #293750; border-radius: 12px; padding: 1.15rem; }
.form { display: grid; gap: 0.9rem; }
.form h2 { color: #e2e8f0; font-size: 1rem; margin: 0; }
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 0.8rem; }
.form-grid .wide { grid-column: 1 / -1; }
label { display: grid; gap: 0.3rem; color: #94a3b8; font-size: 0.78rem; }
input, select { background: #0f1729; border: 1px solid #334155; border-radius: 7px; color: #f8fafc; padding: 0.55rem 0.65rem; font-size: 0.86rem; }
input:focus, select:focus { outline: 2px solid rgba(56, 189, 248, 0.4); border-color: #38bdf8; }
.empty { text-align: center; display: grid; gap: 0.4rem; padding: 2.5rem; }
.empty p { color: #e2e8f0; margin: 0; }
.project-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1rem; }
.project-card { display: grid; gap: 0.85rem; align-content: start; }
.card-header { display: flex; justify-content: space-between; gap: 0.75rem; align-items: flex-start; }
.card-header h2 { color: #f8fafc; font-size: 1.02rem; margin: 0 0 0.25rem; }
.score { border: 1px solid #293750; border-radius: 8px; font-size: 1.2rem; font-weight: 700; min-width: 48px; padding: 0.35rem 0.5rem; text-align: center; color: #e2e8f0; }
.good { color: #86efac; } .warning { color: #fde68a; } .poor { color: #fca5a5; }
.description { color: #cbd5e1; font-size: 0.85rem; margin: 0; line-height: 1.5; }
.meta { display: flex; gap: 1.4rem; margin: 0; }
.meta div { display: grid; gap: 0.15rem; }
.meta dt { color: #64748b; font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.05em; }
.meta dd { color: #e2e8f0; font-size: 0.82rem; margin: 0; }
.card-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.primary { background: #fbbf24; border: 0; border-radius: 7px; color: #0b0c0e; cursor: pointer; font-weight: 700; padding: 0.55rem 0.9rem; font-size: 0.82rem; }
.primary:disabled { opacity: 0.65; cursor: wait; }
.secondary { background: transparent; border: 1px solid #334155; border-radius: 7px; color: #e2e8f0; cursor: pointer; padding: 0.55rem 0.9rem; font-size: 0.82rem; text-decoration: none; }
.danger { background: transparent; border: 1px solid #7f1d1d; border-radius: 7px; color: #fca5a5; cursor: pointer; padding: 0.55rem 0.9rem; font-size: 0.82rem; }
.danger:hover { background: rgba(127, 29, 29, 0.25); }
</style>
