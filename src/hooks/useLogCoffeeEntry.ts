import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAddCoffee, useTodayPercentage } from '@/hooks/useCoffees';
import type { CoffeeDetails } from '@/components/CoffeeDetailsSheet';

export function useLogCoffeeEntry() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const addCoffee = useAddCoffee();
  const { data: percentage } = useTodayPercentage();
  const [showDetailsSheet, setShowDetailsSheet] = useState(false);
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);

  const startLogCoffee = () => {
    if (!user) {
      navigate('/profile?msg=tracking');
      return;
    }
    setShowDetailsSheet(true);
  };

  const handleDetailsSave = async (details: CoffeeDetails) => {
    try {
      await addCoffee.mutateAsync({
        rating: null,
        coffee_type: details.coffee_type,
        coffee_type_other: details.coffee_type_other,
        place: details.place,
        diary: details.diary,
        beans: null,
        note: null,
      });
      setShowDetailsSheet(false);
      setShowCelebrationModal(true);
    } catch (error) {
      console.error('Error adding coffee:', error);
    }
  };

  const percentBeat = 100 - (percentage || 0);

  return {
    startLogCoffee,
    addCoffeePending: addCoffee.isPending,
    detailsSheetOpen: showDetailsSheet,
    setDetailsSheetOpen: setShowDetailsSheet,
    celebrationOpen: showCelebrationModal,
    setCelebrationOpen: setShowCelebrationModal,
    handleDetailsSave,
    percentBeat,
  };
}
