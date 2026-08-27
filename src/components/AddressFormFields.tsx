'use client';

import { useMemo } from 'react';
import { COUNTRIES } from '@/lib/countries';

// Fixed set of address labels - kept deliberately short so people pick
// from real options instead of typing something random/inconsistent.
const LABEL_OPTIONS = ['Home', 'Work', 'Office', 'School', 'Other'];

export interface AddressFormValue {
  label?: string;
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  [key: string]: any;
}

interface AddressFormFieldsProps<T extends AddressFormValue> {
  value: T;
  onChange: (value: T) => void;
  /** Show the "Label" dropdown. Some forms (e.g. changing an order's
   *  shipping address) don't need a label. Defaults to true. */
  showLabel?: boolean;
  /** Whether the phone field is required. Defaults to false. */
  phoneRequired?: boolean;
}

// Countries are sorted by dial-code length (longest first) so a country
// like "American Samoa" (+1684) matches before the shorter "+1" for the US
// when we're figuring out which dial code a phone number currently starts with.
const COUNTRIES_BY_DIAL_LENGTH = [...COUNTRIES].sort((a, b) => b.dial.length - a.dial.length);

export default function AddressFormFields<T extends AddressFormValue>({
  value,
  onChange,
  showLabel = true,
  phoneRequired = false,
}: AddressFormFieldsProps<T>) {
  const set = (patch: Partial<AddressFormValue>) => onChange({ ...value, ...patch } as T);

  // If the address already has a country that isn't in our list (e.g. an
  // older address saved before this dropdown existed), keep showing it as
  // an option so the field doesn't just go blank.
  const countryOptions = useMemo(() => {
    if (value.country && !COUNTRIES.some((c) => c.name === value.country)) {
      return [{ name: value.country, dial: '' }, ...COUNTRIES];
    }
    return COUNTRIES;
  }, [value.country]);

  const handleCountryChange = (countryName: string) => {
    const newDial = COUNTRIES.find((c) => c.name === countryName)?.dial || '';
    if (!newDial) {
      set({ country: countryName });
      return;
    }
    // Swap just the dial-code prefix in the phone field, keeping any
    // digits the person already typed after it.
    const currentPhone = value.phone.trim();
    const prevDial = COUNTRIES_BY_DIAL_LENGTH.find((c) => currentPhone.startsWith(c.dial))?.dial || '';
    const rest = prevDial ? currentPhone.slice(prevDial.length).trim() : currentPhone;
    set({ country: countryName, phone: rest ? `${newDial} ${rest}` : `${newDial} ` });
  };

  const handlePostalCodeChange = (raw: string) => {
    set({ postalCode: raw.replace(/\D/g, '') });
  };

  return (
    <>
      {showLabel && (
        <div>
          <label className="label-field">Label (optional)</label>
          <select
            value={value.label || ''}
            onChange={(e) => set({ label: e.target.value })}
            className="input-field"
          >
            <option value="">No label</option>
            {LABEL_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-field">First name</label>
          <input
            required
            value={value.firstName}
            onChange={(e) => set({ firstName: e.target.value })}
            className="input-field"
          />
        </div>
        <div>
          <label className="label-field">Last name</label>
          <input
            required
            value={value.lastName}
            onChange={(e) => set({ lastName: e.target.value })}
            className="input-field"
          />
        </div>
      </div>
      <div>
        <label className="label-field">Street address</label>
        <input
          required
          value={value.street}
          onChange={(e) => set({ street: e.target.value })}
          className="input-field"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-field">City</label>
          <input
            required
            value={value.city}
            onChange={(e) => set({ city: e.target.value })}
            className="input-field"
          />
        </div>
        <div>
          <label className="label-field">State</label>
          <input
            required
            value={value.state}
            onChange={(e) => set({ state: e.target.value })}
            className="input-field"
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label-field">Postal code</label>
          <input
            required
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={10}
            value={value.postalCode}
            onChange={(e) => handlePostalCodeChange(e.target.value)}
            className="input-field"
          />
        </div>
        <div>
          <label className="label-field">Country</label>
          <select
            required
            value={value.country}
            onChange={(e) => handleCountryChange(e.target.value)}
            className="input-field"
          >
            <option value="" disabled>
              Select a country...
            </option>
            {countryOptions.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label className="label-field">Phone</label>
        <input
          required={phoneRequired}
          value={value.phone}
          onChange={(e) => set({ phone: e.target.value })}
          className="input-field"
          placeholder="+1 234 567 8900"
        />
      </div>
    </>
  );
}
