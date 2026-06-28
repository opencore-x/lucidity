import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectMembersApi } from '@/api/projectMembers';
import type {
  Project,
  ProjectMemberWithUser,
  InviteProjectMember,
  MemberAccess,
  ProjectVisibility,
} from '@lucidity/shared';

const membersKey = (projectId: string) => ['projectMembers', projectId] as const;

export function useProjectMembers(projectId: string | undefined) {
  return useQuery({
    queryKey: membersKey(projectId ?? ''),
    queryFn: () => projectMembersApi.list(projectId!),
    enabled: !!projectId,
  });
}

export function useInviteMember(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: InviteProjectMember) => projectMembersApi.invite(projectId, data),
    onSuccess: (member) => {
      // The server returns the full member (joined identity); append it.
      queryClient.setQueryData<ProjectMemberWithUser[]>(membersKey(projectId), (old) =>
        old ? [...old, member] : [member]
      );
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: membersKey(projectId) });
    },
  });
}

export function useUpdateMemberAccess(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, access }: { userId: string; access: MemberAccess }) =>
      projectMembersApi.updateAccess(projectId, userId, access),
    onMutate: async ({ userId, access }) => {
      await queryClient.cancelQueries({ queryKey: membersKey(projectId) });
      const previous = queryClient.getQueryData<ProjectMemberWithUser[]>(membersKey(projectId));
      queryClient.setQueryData<ProjectMemberWithUser[]>(membersKey(projectId), (old) =>
        old?.map((m) => (m.userId === userId ? { ...m, access } : m))
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(membersKey(projectId), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: membersKey(projectId) });
    },
  });
}

export function useRemoveMember(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => projectMembersApi.remove(projectId, userId),
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: membersKey(projectId) });
      const previous = queryClient.getQueryData<ProjectMemberWithUser[]>(membersKey(projectId));
      queryClient.setQueryData<ProjectMemberWithUser[]>(membersKey(projectId), (old) =>
        old?.filter((m) => m.userId !== userId)
      );
      return { previous };
    },
    onError: (_err, _userId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(membersKey(projectId), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: membersKey(projectId) });
    },
  });
}

export function useSetProjectVisibility(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (visibility: ProjectVisibility) =>
      projectMembersApi.setVisibility(projectId, visibility),
    onMutate: async (visibility) => {
      await queryClient.cancelQueries({ queryKey: ['projects'] });
      const previousList = queryClient.getQueryData<Project[]>(['projects']);
      const previousOne = queryClient.getQueryData<Project>(['projects', projectId]);
      queryClient.setQueryData<Project[]>(['projects'], (old) =>
        old?.map((p) => (p.id === projectId ? { ...p, visibility } : p))
      );
      queryClient.setQueryData<Project>(['projects', projectId], (old) =>
        old ? { ...old, visibility } : old
      );
      return { previousList, previousOne };
    },
    onError: (_err, _visibility, context) => {
      if (context?.previousList) {
        queryClient.setQueryData(['projects'], context.previousList);
      }
      if (context?.previousOne) {
        queryClient.setQueryData(['projects', projectId], context.previousOne);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['projects', projectId] });
    },
  });
}
