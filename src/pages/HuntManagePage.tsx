import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useHunt, useTreasures } from '@/hooks/useHunts';
import { useOrgs } from '@/hooks/useOrgs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, MapPin, Pencil, Plus, QrCode } from 'lucide-react';
import QRCode from 'react-qr-code';

export default function HuntManagePage() {
  const { huntId } = useParams<{ huntId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { canHostEvent, isLoading: roleLoading } = useUserRole();
  const { data: hunt, isLoading, isError, refetch } = useHunt(huntId ?? null);
  const { data: treasures = [] } = useTreasures(huntId ?? null, false);
  const { data: orgs = [] } = useOrgs();
  const { toast } = useToast();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editOrgId, setEditOrgId] = useState('');
  const [isEditSubmitting, setIsEditSubmitting] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedTreasure, setSelectedTreasure] = useState<{ id: string; qr_code_id: string; name: string } | null>(null);

  useEffect(() => {
    if (hunt && editDialogOpen) {
      setEditName(hunt.name);
      setEditDescription(hunt.description ?? '');
      setEditOrgId(hunt.org_id);
    }
  }, [hunt, editDialogOpen]);

  if (isError) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="container px-4 py-8 text-center">
          <p className="text-muted-foreground">Could not load hunt.</p>
          <div className="flex gap-2 justify-center mt-4">
            <Button variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
            <Button variant="outline" onClick={() => navigate('/hunts')}>
              Back to Hunts
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || roleLoading || !hunt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-lg font-semibold">Loading...</div>
      </div>
    );
  }

  if (!user || !canHostEvent || hunt.created_by !== user.id) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="container px-4 py-8 text-center">
          <p className="text-muted-foreground">Access denied.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/hunts')}>
            Back to Hunts
          </Button>
        </div>
      </div>
    );
  }

  const handleActivate = async () => {
    if (!huntId) return;
    try {
      const { error } = await (supabase as any)
        .from('hunts')
        .update({ status: 'active' })
        .eq('id', huntId);

      if (error) throw error;
      toast({ title: 'Hunt is now active!' });
      navigate(`/hunts/${huntId}`);
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: (err as Error).message || 'Failed to activate.',
        variant: 'destructive',
      });
    }
  };

  const handleEditHunt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!huntId || !editName.trim()) return;

    setIsEditSubmitting(true);
    try {
      const { error } = await (supabase as any)
        .from('hunts')
        .update({
          name: editName.trim(),
          description: editDescription.trim() || null,
          org_id: editOrgId,
        })
        .eq('id', huntId);

      if (error) throw error;

      toast({ title: 'Hunt updated!' });
      setEditDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ['hunt', huntId] });
      queryClient.invalidateQueries({ queryKey: ['my-hunts'] });
      refetch();
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: (err as Error).message || 'Failed to update hunt.',
        variant: 'destructive',
      });
    } finally {
      setIsEditSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background py-4 px-4 border-b border-border">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-black uppercase tracking-tight">
            Manage Hunt
          </h1>
        </div>
      </div>

      <div className="container px-4 py-6 max-w-sm mx-auto space-y-6">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="font-bold">{hunt.name}</h2>
            <p className="text-sm text-muted-foreground">
              Status: {hunt.status} · {treasures.length} treasures
            </p>
          </div>
          {hunt.status === 'draft' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditDialogOpen(true)}
              className="shrink-0"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </div>

        {hunt.status === 'draft' && (
          <Button className="w-full btn-run btn-run-yes" onClick={handleActivate}>
            Activate Hunt
          </Button>
        )}

        <div>
          <h3 className="font-semibold mb-2">Treasures</h3>
          <div className="space-y-2">
            {treasures.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border"
              >
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{t.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedTreasure({ id: t.id, qr_code_id: t.qr_code_id, name: t.name });
                    setQrDialogOpen(true);
                  }}
                >
                  <QrCode className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <Button
            variant="outline"
            className="w-full mt-2"
            onClick={() => huntId && navigate(`/host/offer/create?mode=hunt&huntId=${huntId}`)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Treasure
          </Button>
        </div>
      </div>

      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>{selectedTreasure?.name}</DialogTitle>
          </DialogHeader>
          {selectedTreasure && (
            <div className="flex flex-col items-center gap-3 py-2">
              <div className="bg-white p-3 rounded-md">
                <QRCode value={selectedTreasure.qr_code_id} size={200} />
              </div>
              <p className="text-xs text-muted-foreground font-mono">
                {selectedTreasure.qr_code_id}
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Hunt</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditHunt} className="space-y-4">
            <div className="space-y-2">
              <Label>Hunt Name *</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Central Park Coffee Hunt"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Find all the treasures..."
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Organization *</Label>
              <Select value={editOrgId} onValueChange={setEditOrgId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {orgs.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.org_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={isEditSubmitting}>
              {isEditSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
