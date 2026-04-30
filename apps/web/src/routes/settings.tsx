import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useUser, useClerk } from '@clerk/tanstack-react-start'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Copy, Key, LogOut, RefreshCw, Trash2, User } from 'lucide-react'
import { apiClient } from '~/api/client'
import { useAuthReady } from '~/providers/ApiProvider'
import { useProjects, useUpdateProject } from '~/hooks/useProjects'
import { Button } from '~/components/ui/button'
import { Separator } from '~/components/ui/separator'
import { cn } from '~/lib/utils'

export const Route = createFileRoute('/settings')({
  component: SettingsPage,
})

interface ApiKeyInfo {
  exists: boolean
  prefix?: string
  createdAt?: string
  lastUsedAt?: string | null
}

function useApiKeyInfo() {
  const authReady = useAuthReady()
  return useQuery({
    queryKey: ['apiKey'],
    queryFn: () => apiClient<ApiKeyInfo>('/api/api-key'),
    enabled: authReady,
  })
}

function useGenerateApiKey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiClient<{ key: string; prefix: string }>('/api/api-key', {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKey'] })
    },
  })
}

function useRevokeApiKey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiClient<void>('/api/api-key', { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKey'] })
    },
  })
}

function SettingsPage() {
  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage your account and preferences.
      </p>

      <div className="mt-8 flex flex-col gap-8">
        <ProfileSection />
        <Separator />
        <ApiKeySection />
        <Separator />
        <ProjectsSection />
      </div>
    </div>
  )
}

function ProfileSection() {
  const { user } = useUser()
  const { openUserProfile, signOut } = useClerk()

  if (!user) return null

  const name = user.fullName || user.username || 'User'
  const email = user.primaryEmailAddress?.emailAddress || ''

  return (
    <section>
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <User className="h-4 w-4" />
        Profile
      </h2>
      <div className="mt-3 rounded-lg border bg-card p-4">
        <div className="flex items-center gap-4">
          {user.imageUrl && (
            <img
              src={user.imageUrl}
              alt={name}
              className="h-12 w-12 rounded-full"
            />
          )}
          <div>
            <p className="font-medium">{name}</p>
            <p className="text-sm text-muted-foreground">{email}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" size="sm" onClick={() => openUserProfile()}>
            Edit profile
          </Button>
          <Button variant="ghost" size="sm" onClick={() => signOut()}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </div>
    </section>
  )
}

function ApiKeySection() {
  const keyInfoQuery = useApiKeyInfo()
  const generateKey = useGenerateApiKey()
  const revokeKey = useRevokeApiKey()
  const [newKey, setNewKey] = React.useState<string | null>(null)
  const [copied, setCopied] = React.useState(false)

  const keyInfo = keyInfoQuery.data

  async function handleGenerate() {
    const result = await generateKey.mutateAsync()
    setNewKey(result.key)
    setCopied(false)
  }

  function handleCopy() {
    if (newKey) {
      navigator.clipboard.writeText(newKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function handleRevoke() {
    revokeKey.mutate()
    setNewKey(null)
  }

  return (
    <section>
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <Key className="h-4 w-4" />
        API Key
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Use an API key to access Lucidity from the MCP server or other integrations.
      </p>

      <div className="mt-3 rounded-lg border bg-card p-4">
        {newKey && (
          <div className="mb-4 rounded-md border border-amber-500/30 bg-amber-500/10 p-3">
            <p className="mb-2 text-xs font-medium text-amber-600">
              Copy your API key now — it won't be shown again.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded bg-muted px-2 py-1 text-xs font-mono">
                {newKey}
              </code>
              <Button variant="outline" size="xs" onClick={handleCopy}>
                <Copy className="h-3 w-3" />
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>
        )}

        {keyInfo?.exists ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm">
                Key: <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">{keyInfo.prefix}...</code>
              </p>
              {keyInfo.createdAt && (
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Created {new Date(keyInfo.createdAt).toLocaleDateString()}
                  {keyInfo.lastUsedAt &&
                    ` · Last used ${new Date(keyInfo.lastUsedAt).toLocaleDateString()}`}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="xs"
                onClick={handleGenerate}
                disabled={generateKey.isPending}
              >
                <RefreshCw className="h-3 w-3" />
                Regenerate
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={handleRevoke}
                disabled={revokeKey.isPending}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
                Revoke
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">No API key generated.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={generateKey.isPending}
            >
              <Key className="h-4 w-4" />
              Generate key
            </Button>
          </div>
        )}
      </div>
    </section>
  )
}

function ProjectsSection() {
  const projectsQuery = useProjects()
  const updateProject = useUpdateProject()

  const projects = projectsQuery.data ?? []
  const activeProjects = projects.filter((p) => !p.isArchived)
  const archivedProjects = projects.filter((p) => p.isArchived)

  return (
    <section>
      <h2 className="text-sm font-semibold">Projects</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Archive or unarchive projects.
      </p>

      <div className="mt-3 rounded-lg border bg-card">
        {activeProjects.length === 0 && archivedProjects.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground">No projects yet.</p>
        )}

        {activeProjects.map((project) => (
          <div
            key={project.id}
            className="flex items-center justify-between border-b px-4 py-2.5 last:border-b-0"
          >
            <div className="flex items-center gap-2">
              {project.color && (
                <div
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: project.color }}
                />
              )}
              <span className="text-sm">{project.name}</span>
            </div>
            <Button
              variant="ghost"
              size="xs"
              onClick={() =>
                updateProject.mutate({
                  id: project.id,
                  data: { isArchived: true },
                })
              }
            >
              Archive
            </Button>
          </div>
        ))}

        {archivedProjects.length > 0 && (
          <>
            <div className="border-t px-4 py-2 text-xs font-medium text-muted-foreground">
              Archived
            </div>
            {archivedProjects.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between border-b px-4 py-2.5 last:border-b-0"
              >
                <span className="text-sm text-muted-foreground">
                  {project.name}
                </span>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() =>
                    updateProject.mutate({
                      id: project.id,
                      data: { isArchived: false },
                    })
                  }
                >
                  Unarchive
                </Button>
              </div>
            ))}
          </>
        )}
      </div>
    </section>
  )
}
