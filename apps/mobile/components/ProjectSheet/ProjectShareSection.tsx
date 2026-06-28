import * as React from 'react';
import {
  Section,
  Picker,
  HStack,
  VStack,
  Spacer,
  Text,
  Image,
} from '@expo/ui/swift-ui';
import {
  tag,
  pickerStyle,
  foregroundStyle,
  font,
  frame,
  contentShape,
  shapes,
  onTapGesture,
} from '@expo/ui/swift-ui/modifiers';
import { Alert } from 'react-native';
import { EditableField } from '@/components/native/EditableField';
import {
  useProjectMembers,
  useInviteMember,
  useUpdateMemberAccess,
  useRemoveMember,
  useSetProjectVisibility,
} from '@/hooks/useProjectMembers';
import type { Project, ProjectVisibility, MemberAccess } from '@lucidity/shared';

const SECONDARY = '#8E8E93';
const DESTRUCTIVE_RED = '#FF3B30';

const VISIBILITY_FOOTER: Record<ProjectVisibility, string> = {
  private: 'Only you can see this project.',
  shared: 'Only people you invite can see this project.',
  public: 'Anyone with the link can view this project.',
};

/**
 * Owner-only sharing controls folded into the project editor (task #230): a
 * visibility picker, an invite-by-email row, and the member roster with a
 * per-member view/edit picker and remove. Collaborators never see this — the
 * whole section is gated on `project.userAccess === 'owner'`.
 */
export function ProjectShareSection({ project }: { project: Project }) {
  const projectId = project.id;
  const visibility = (project.visibility ?? 'private') as ProjectVisibility;

  const { data: members = [] } = useProjectMembers(projectId);
  const setVisibility = useSetProjectVisibility(projectId);
  const invite = useInviteMember(projectId);
  const updateAccess = useUpdateMemberAccess(projectId);
  const removeMember = useRemoveMember(projectId);

  // Bumping the key remounts the email field, clearing it after a successful invite.
  const [inviteKey, setInviteKey] = React.useState(0);
  const [inviteAccess, setInviteAccess] = React.useState<MemberAccess>('edit');

  const handleInvite = React.useCallback(
    (email: string) => {
      const trimmed = email.trim();
      if (!trimmed) return;
      invite.mutate(
        { email: trimmed, access: inviteAccess },
        {
          onSuccess: () => setInviteKey((k) => k + 1),
          onError: (err) => {
            const message =
              err instanceof Error ? err.message : 'Could not invite that user.';
            Alert.alert('Invite failed', message);
            setInviteKey((k) => k + 1);
          },
        }
      );
    },
    [invite, inviteAccess]
  );

  const handleRemove = React.useCallback(
    (userId: string, name: string) => {
      Alert.alert('Remove collaborator', `Remove ${name} from this project?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => removeMember.mutate(userId),
        },
      ]);
    },
    [removeMember]
  );

  return (
    <>
      <Section title="Sharing" footer={<Text>{VISIBILITY_FOOTER[visibility]}</Text>}>
        <Picker
          selection={visibility}
          onSelectionChange={(v) => setVisibility.mutate(v as ProjectVisibility)}
          modifiers={[pickerStyle('segmented')]}>
          <Text modifiers={[tag('private')]}>Private</Text>
          <Text modifiers={[tag('shared')]}>Shared</Text>
          <Text modifiers={[tag('public')]}>Public</Text>
        </Picker>
      </Section>

      <Section
        title="People"
        footer={<Text>Invite an existing Lucidity user by their email.</Text>}>
        <Picker
          selection={inviteAccess}
          onSelectionChange={(v) => setInviteAccess(v as MemberAccess)}
          modifiers={[pickerStyle('segmented')]}>
          <Text modifiers={[tag('view')]}>Can view</Text>
          <Text modifiers={[tag('edit')]}>Can edit</Text>
        </Picker>

        <EditableField
          key={`invite-${inviteKey}`}
          value=""
          allowEmpty
          placeholder="Invite by email…"
          onCommit={handleInvite}
        />

        {members.map((m) => (
          <HStack key={m.userId} spacing={10}>
            <Image systemName="person.crop.circle.fill" size={28} color={SECONDARY} />
            <VStack alignment="leading" spacing={1}>
              <Text>{m.name}</Text>
              <Text modifiers={[font({ size: 13 }), foregroundStyle(SECONDARY)]}>
                {m.email}
              </Text>
            </VStack>
            <Spacer />
            <Picker
              selection={m.access}
              onSelectionChange={(v) =>
                updateAccess.mutate({ userId: m.userId, access: v as MemberAccess })
              }
              modifiers={[pickerStyle('menu')]}>
              <Text modifiers={[tag('view')]}>Can view</Text>
              <Text modifiers={[tag('edit')]}>Can edit</Text>
            </Picker>
            <Image
              systemName="minus.circle.fill"
              size={22}
              color={DESTRUCTIVE_RED}
              modifiers={[
                frame({ width: 30 }),
                contentShape(shapes.circle()),
                onTapGesture(() => handleRemove(m.userId, m.name)),
              ]}
            />
          </HStack>
        ))}
      </Section>
    </>
  );
}
