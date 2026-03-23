import { useState, useEffect, useRef } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useHunt, useTreasures, type Treasure } from '@/hooks/useHunts';
import { useOrgs } from '@/hooks/useOrgs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, ImageIcon, MapPin, Pencil, Plus, QrCode, Trash2 } from 'lucide-react';
import QRCode from 'react-qr-code';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
}

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

  const [editTreasureDialogOpen, setEditTreasureDialogOpen] = useState(false);
  const [editingTreasure, setEditingTreasure] = useState<Treasure | null>(null);
  const [editTreasureName, setEditTreasureName] = useState('');
  const [editTreasureDescription, setEditTreasureDescription] = useState('');
  const [editTreasureAddress, setEditTreasureAddress] = useState('');
  const [editTreasureLat, setEditTreasureLat] = useState('');
  const [editTreasureLng, setEditTreasureLng] = useState('');
  const [editTreasureClaimLimit, setEditTreasureClaimLimit] = useState('');
  const [editTreasureStartsAt, setEditTreasureStartsAt] = useState('');
  const [editTreasureEndsAt, setEditTreasureEndsAt] = useState('');
  const [editTreasureClueImage, setEditTreasureClueImage] = useState('');
  const [editTreasurePhotoMode, setEditTreasurePhotoMode] = useState<'link' | 'upload'>('link');
  const [editTreasureUploading, setEditTreasureUploading] = useState(false);
  const [isEditTreasureSubmitting, setIsEditTreasureSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (hunt && editDialogOpen) {
      setEditName(hunt.name);
      setEditDescription(hunt.description ?? '');
      setEditOrgId(hunt.org_id);
    }
  }, [hunt, editDialogOpen]);

  useEffect(() => {
    if (editingTreasure && editTreasureDialogOpen) {
      setEditTreasureName(editingTreasure.name);
      setEditTreasureDescription(editingTreasure.description ?? '');
      setEditTreasureAddress(editingTreasure.address ?? '');
      setEditTreasureLat(editingTreasure.lat != null ? String(editingTreasure.lat) : '');
      setEditTreasureLng(editingTreasure.lng != null ? String(editingTreasure.lng) : '');
      setEditTreasureClaimLimit(
        editingTreasure.claim_limit != null ? String(editingTreasure.claim_limit) : ''
      );
      setEditTreasureStartsAt(toDatetimeLocal(editingTreasure.starts_at));
      setEditTreasureEndsAt(toDatetimeLocal(editingTreasure.ends_at));
      setEditTreasureClueImage(editingTreasure.clue_image ?? '');
    }
  }, [editingTreasure, editTreasureDialogOpen]);

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

  const openEditTreasure = (t: Treasure) => {
    setEditingTreasure(t);
    setEditTreasureDialogOpen(true);
  };

  const handleEditTreasureFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !huntId || !editingTreasure) return;

    if (!ALLOWED_MIME.includes(file.type)) {
      toast({
        title: 'Invalid file type',
        description: 'Please use JPEG, PNG, WebP, or GIF.',
        variant: 'destructive',
      });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: 'File too large',
        description: 'Maximum size is 5MB.',
        variant: 'destructive',
      });
      return;
    }

    setEditTreasureUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `${huntId}/${editingTreasure.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

      const { error } = await supabase.storage.from('treasure-images').upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      });

      if (error) throw error;

      const { data } = supabase.storage.from('treasure-images').getPublicUrl(path);
      setEditTreasureClueImage(data.publicUrl);
      setEditTreasurePhotoMode('link');
      toast({ title: 'Photo uploaded!' });
    } catch (err: unknown) {
      toast({
        title: 'Upload failed',
        description: (err as Error).message || 'Could not upload photo.',
        variant: 'destructive',
      });
    } finally {
      setEditTreasureUploading(false);
      e.target.value = '';
    }
  };

  const handleEditTreasure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTreasure || !huntId || !editTreasureName.trim()) return;

    setIsEditTreasureSubmitting(true);
    try {
      const payload = {
        name: editTreasureName.trim(),
        description: editTreasureDescription.trim() || null,
        address: editTreasureAddress.trim() || null,
        lat: editTreasureLat ? parseFloat(editTreasureLat) : null,
        lng: editTreasureLng ? parseFloat(editTreasureLng) : null,
        claim_limit: editTreasureClaimLimit ? parseInt(editTreasureClaimLimit, 10) : null,
        starts_at: editTreasureStartsAt
          ? editTreasureStartsAt.length >= 16
            ? `${editTreasureStartsAt}:00`
            : editTreasureStartsAt
          : null,
        ends_at: editTreasureEndsAt
          ? editTreasureEndsAt.length >= 16
            ? `${editTreasureEndsAt}:00`
            : editTreasureEndsAt
          : null,
        clue_image: editTreasureClueImage.trim() || null,
      };

      const { error } = await (supabase as any)
        .from('treasures')
        .update(payload)
        .eq('id', editingTreasure.id);

      if (error) throw error;

      toast({ title: 'Treasure updated!' });
      setEditTreasureDialogOpen(false);
      setEditingTreasure(null);
      queryClient.invalidateQueries({ queryKey: ['treasures', huntId] });
      queryClient.invalidateQueries({ queryKey: ['all-treasures'] });
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: (err as Error).message || 'Failed to update treasure.',
        variant: 'destructive',
      });
    } finally {
      setIsEditTreasureSubmitting(false);
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
                <button
                  type="button"
                  onClick={() => openEditTreasure(t)}
                  className="flex items-center gap-2 flex-1 min-w-0 text-left"
                >
                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="truncate">{t.name}</span>
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditTreasure(t)}
                    aria-label="Edit treasure"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedTreasure({ id: t.id, qr_code_id: t.qr_code_id, name: t.name });
                      setQrDialogOpen(true);
                    }}
                    aria-label="View QR code"
                  >
                    <QrCode className="h-4 w-4" />
                  </Button>
                </div>
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

      <Dialog open={editTreasureDialogOpen} onOpenChange={setEditTreasureDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Treasure</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditTreasure} className="space-y-4">
            <div className="space-y-2">
              <Label>Treasure Name *</Label>
              <Input
                value={editTreasureName}
                onChange={(e) => setEditTreasureName(e.target.value)}
                placeholder="Stop 1"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={editTreasureDescription}
                onChange={(e) => setEditTreasureDescription(e.target.value)}
                placeholder="A clue about this location..."
                className="min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Address (optional)</Label>
              <Input
                value={editTreasureAddress}
                onChange={(e) => setEditTreasureAddress(e.target.value)}
                placeholder="123 Main St"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Lat (optional)</Label>
                <Input
                  type="number"
                  step="any"
                  value={editTreasureLat}
                  onChange={(e) => setEditTreasureLat(e.target.value)}
                  placeholder="40.7128"
                />
              </div>
              <div className="space-y-2">
                <Label>Lng (optional)</Label>
                <Input
                  type="number"
                  step="any"
                  value={editTreasureLng}
                  onChange={(e) => setEditTreasureLng(e.target.value)}
                  placeholder="-74.0060"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Claim limit (optional)</Label>
              <Input
                type="number"
                min={1}
                value={editTreasureClaimLimit}
                onChange={(e) => setEditTreasureClaimLimit(e.target.value)}
                placeholder="Unlimited"
              />
            </div>
            <div className="space-y-2">
              <Label>Starts at (optional)</Label>
              <Input
                type="datetime-local"
                value={editTreasureStartsAt}
                onChange={(e) => setEditTreasureStartsAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Ends at (optional)</Label>
              <Input
                type="datetime-local"
                value={editTreasureEndsAt}
                onChange={(e) => setEditTreasureEndsAt(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Clue image (optional)</Label>
              <Tabs
                value={editTreasurePhotoMode}
                onValueChange={(v) => setEditTreasurePhotoMode(v as 'link' | 'upload')}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="link">Photo link</TabsTrigger>
                  <TabsTrigger value="upload">Upload photo</TabsTrigger>
                </TabsList>
                <TabsContent value="link" className="space-y-2 mt-2">
                  <Input
                    type="url"
                    value={editTreasureClueImage}
                    onChange={(e) => setEditTreasureClueImage(e.target.value)}
                    placeholder="https://example.com/image.jpg"
                  />
                  {editTreasureClueImage && (
                    <div className="flex items-center gap-2">
                      <img
                        src={editTreasureClueImage}
                        alt="Preview"
                        className="w-20 h-20 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditTreasureClueImage('')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="upload" className="space-y-2 mt-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    onChange={handleEditTreasureFileUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={editTreasureUploading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {editTreasureUploading ? (
                      'Uploading...'
                    ) : (
                      <>
                        <ImageIcon className="h-4 w-4 mr-2" />
                        Choose file (max 5MB, JPEG/PNG/WebP/GIF)
                      </>
                    )}
                  </Button>
                  {editTreasureClueImage && (
                    <div className="flex items-center gap-2">
                      <img
                        src={editTreasureClueImage}
                        alt="Preview"
                        className="w-20 h-20 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditTreasureClueImage('')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>

            <Button type="submit" className="w-full" disabled={isEditTreasureSubmitting}>
              {isEditTreasureSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
