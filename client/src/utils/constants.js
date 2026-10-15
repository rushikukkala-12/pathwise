import { Mountain, Compass, Landmark, Waves, Utensils, ShoppingBag, Palette, Camera, Ticket, Sofa, Leaf, Castle, Clapperboard } from 'lucide-react';

export const INTERESTS = [
  { id: 'Nature', icon: Leaf, hint: 'Gardens, hills, lakes' },
  { id: 'Adventure', icon: Mountain, hint: 'Treks, falls, water sports' },
  { id: 'Historical', icon: Castle, hint: 'Forts, palaces, ruins' },
  { id: 'Beaches', icon: Waves, hint: 'Sand, sunsets, shacks' },
  { id: 'Food', icon: Utensils, hint: 'Local cuisine & street food' },
  { id: 'Shopping', icon: ShoppingBag, hint: 'Markets and malls' },
  { id: 'Culture', icon: Palette, hint: 'Temples, museums, art' },
  { id: 'Photography', icon: Camera, hint: 'Viewpoints & golden hour' },
  { id: 'Entertainment', icon: Ticket, hint: 'Parks, shows, nightlife' },
  { id: 'Relaxation', icon: Sofa, hint: 'Slow days, spas, scenery' },
];

export const PLACE_CATEGORIES = ['Nature', 'Historical', 'Adventure', 'Beach', 'Food', 'Shopping', 'Culture', 'Entertainment'];
export const CROWD_LEVELS = ['Low', 'Medium', 'High'];
export const BEST_TIMES = ['Morning', 'Afternoon', 'Evening', 'Anytime'];
export const EXPENSE_CATEGORIES = ['Accommodation', 'Food', 'Transportation', 'Activities', 'Shopping', 'Other'];

// Chart + badge colours for expense categories
export const EXPENSE_COLORS = { Accommodation: '#3B41B2', Food: '#EE7511', Transportation: '#129D8F', Activities: '#8B5CF6', Shopping: '#EC4899', Other: '#94A3B8' };

// Budget states (the same thresholds are computed server-side): 50 / 75 / 90 / 100+
export const BUDGET_LEVELS = {
  safe: { label: 'On track', bar: 'bg-sea-500', hex: '#129D8F', text: 'text-sea-700', soft: 'bg-sea-50 text-sea-700 ring-sea-200' },
  moderate: { label: 'Half used', bar: 'bg-brand-500', hex: '#4C54D0', text: 'text-brand-700', soft: 'bg-brand-50 text-brand-700 ring-brand-200' },
  caution: { label: 'Running low', bar: 'bg-amber-500', hex: '#F59E0B', text: 'text-amber-700', soft: 'bg-amber-50 text-amber-700 ring-amber-200' },
  critical: { label: 'Almost out', bar: 'bg-sun-500', hex: '#EE7511', text: 'text-sun-600', soft: 'bg-sun-50 text-sun-700 ring-sun-200' },
  exceeded: { label: 'Over budget', bar: 'bg-red-500', hex: '#EF4444', text: 'text-red-600', soft: 'bg-red-50 text-red-700 ring-red-200' },
};

export const STATUS_STYLE = {
  Active: 'bg-sea-50 text-sea-700 ring-sea-200',
  Planned: 'bg-brand-50 text-brand-700 ring-brand-200',
  Completed: 'bg-slate-100 text-slate-600 ring-slate-200',
  Cancelled: 'bg-red-50 text-red-700 ring-red-200',
};

export const CATEGORY_STYLE = {
  Nature: { from: '#0C7E74', to: '#58D2C4' }, Historical: { from: '#A04609', to: '#FFAA61' }, Adventure: { from: '#242872', to: '#707AE8' },
  Beach: { from: '#0A6FA8', to: '#7DD3F5' }, Food: { from: '#B3340F', to: '#FA8B30' }, Shopping: { from: '#8A2C7A', to: '#E879B9' },
  Culture: { from: '#5B3FB0', to: '#B79CF5' }, Entertainment: { from: '#9A1E52', to: '#F472A8' },
};
export const SLOT_ORDER = ['Morning', 'Afternoon', 'Evening'];
export const CROWD_STYLE = { Low: 'bg-sea-50 text-sea-700 ring-sea-200', Medium: 'bg-amber-50 text-amber-700 ring-amber-200', High: 'bg-red-50 text-red-700 ring-red-200' };
export const INDIAN_CITIES = ['Hyderabad', 'Vizag', 'Araku', 'Vijayawada', 'Tirupati', 'Goa', 'Bengaluru', 'Chennai', 'Jaipur', 'Delhi', 'Kerala', 'Eluru', 'Mumbai', 'Kolkata', 'Pune', 'Guntur', 'Rajahmundry', 'Warangal'];
