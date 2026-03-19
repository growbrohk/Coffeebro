import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useOrgs } from '@/hooks/useOrgs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';

export default function CreateHuntPage() {
  const { user } = useAuth();
  const { canHostEvent, isLoading: roleLoading } = useUserRole();
  const { data: orgs = [] } = useOrgs();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [orgId, setOrgId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (orgs.length > 0 && !orgId) {
      setOrgId(orgs[0].id);
    }
  }, [orgs, orgId]);

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-lg font-semibold">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="sticky top-0 z-10 bg-background py-4 px-4 border-b border-border">
          <h1 className="text-2xl font-black uppercase tracking-tight text-center">
            Create Hunt
          </h1>
        </div>
        <div className="container px-4 py-8">
          <div className="max-w-sm mx-auto p-6 bg-foreground text-background text-center">
            <p className="font-bold uppercase mb-4">Please log in to create hunts.</p>
            <Button onClick={() => navigate('/profile')} variant="outline" className="btn-run">
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!canHostEvent) {
    return (
      <div className="min-h-screen bg-background pb-24">
        <div className="sticky top-0 z-10 bg-background py-4 px-4 border-b border-border">
          <div className="flex items-center justify-center relative">
            <button onClick={() => navigate(-1)} className="absolute left-0 p-2">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-black uppercase tracking-tight">
              Create Hunt
            </h1>
          </div>
        </div>
        <div className="container px-4 py-8">
          <div className="max-w-sm mx-auto p-6 bg-foreground text-background text-center">
            <p className="font-bold uppercase mb-2">Access Required</p>
            <p className="text-sm mb-4">Host access is required to create hunts.</p>
            <Button onClick={() => navigate('/profile')} variant="outline" className="btn-run">
              Back to Profile
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !name.trim()) {
      toast({
        title: 'Missing fields',
        description: 'Please fill in organization and name.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await (supabase as any)
        .from('hunts')
        .insert({
          org_id: orgId,
          created_by: user.id,
          name: name.trim(),
          description: description.trim() || null,
          status: 'draft',
        })
        .select('id')
        .single();

      if (error) throw error;

      toast({
        title: 'Hunt Created!',
        description: 'Add treasures and rewards to get started.',
      });

      navigate(`/host/hunts/${data.id}`);
    } catch (err: unknown) {
      console.error(err);
      toast({
        title: 'Error',
        description: (err as Error).message || 'Failed to create hunt.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background py-4 px-4 border-b border-border">
        <div className="flex items-center justify-center relative">
          <button onClick={() => navigate(-1)} className="absolute left-0 p-2">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-2xl font-black uppercase tracking-tight">
            Create Hunt
          </h1>
        </div>
      </div>

      <div className="container px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto">
          <div className="space-y-2">
            <Label htmlFor="org" className="text-sm font-semibold uppercase">
              Organization *
            </Label>
            <Select value={orgId} onValueChange={setOrgId} required>
              <SelectTrigger className="h-12 text-lg">
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

          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-semibold uppercase">
              Hunt Name *
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Central Park Coffee Hunt"
              className="h-12 text-lg"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-semibold uppercase">
              Description (Optional)
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Find all the treasures..."
              className="min-h-[100px] text-lg"
            />
          </div>

          <Button
            type="submit"
            className="w-full btn-run btn-run-yes"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating...' : 'Create Hunt'}
          </Button>
        </form>
      </div>
    </div>
  );
}
