// src/components/SignUpForm.jsx
// Requires: tailwindcss, lucide-react, and shadcn/ui components:
//   npx shadcn@latest add tabs input label select button
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Building2, Eye, EyeOff, ChevronLeft, Zap, Loader2 } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DEPARTMENTS = [
  "Sales & CRM",
  "Operations",
  "Inventory",
  "Engineering",
  "Installation",
  "Support",
];

const ACCENT = "#d4ec7c"; // lime accent used on the landing page

const fieldCls =
  "h-11 rounded-xl border-white/10 bg-white/[0.04] text-white placeholder:text-white/35 " +
  "focus-visible:border-[#d4ec7c]/60 focus-visible:ring-[#d4ec7c]/20";

function PasswordInput({ id, value, onChange, placeholder = "••••••••", autoComplete }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`${fieldCls} pr-11`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

function Field({ label, error, children, htmlFor }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-medium text-white/70">
        {label}
      </Label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

const emptyForm = {
  fullName: "",
  email: "",
  phone: "",
  department: DEPARTMENTS[0],
  password: "",
  confirm: "",
};

export default function SignUpForm() {
  const navigate = useNavigate();
  const [role, setRole] = useState("customer"); // "customer" | "employee"
  const [form, setForm] = useState(emptyForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverMsg, setServerMsg] = useState("");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    const e = {};
    if (!form.fullName.trim()) e.fullName = "Full name is required";
    if (!/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Enter a valid email address";
    if (role === "customer" && form.phone && !/^[0-9+\-\s]{7,15}$/.test(form.phone))
      e.phone = "Enter a valid phone number";
    if (form.password.length < 8) e.password = "Use at least 8 characters";
    if (form.confirm !== form.password) e.confirm = "Passwords do not match";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRoleChange = (value) => {
    setRole(value);
    setErrors({});
    setServerMsg("");
  };

  // One handler for BOTH roles: register, then sign the user in.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerMsg("");
    if (!validate()) return;

    setLoading(true);
    try {
      const payload = {
        role,
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        ...(role === "employee"
          ? { department: form.department }
          : { phone: form.phone }),
      };

      // TODO: replace with your real API call
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Sign up failed");

      // Store session (swap for your auth context / cookies)
      localStorage.setItem("solvix_token", data.token);
      localStorage.setItem("solvix_role", data.role);

      // Customers land straight in their portal. Employees need admin
      // approval, so the API should return status: "pending" for them.
      if (data.role === "employee" && data.status === "pending") {
        navigate("/employee/pending");
      } else {
        navigate(data.role === "employee" ? "/employee/dashboard" : "/customer/dashboard");
      }
    } catch (err) {
      setServerMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const tabCls =
    "flex-1 gap-2 rounded-lg text-xs font-medium text-white/60 transition " +
    "data-[state=active]:bg-[#d4ec7c] data-[state=active]:text-[#0b1020] data-[state=active]:shadow-none";

  return (
    <section className="flex min-h-screen items-center justify-center bg-transparent px-4 py-28">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1 text-xs text-white/60 hover:text-white"
        >
          <ChevronLeft size={14} /> Back to home
        </Link>

        <div className="mb-4 flex items-center gap-2">
          <span
            className="grid h-7 w-7 place-items-center rounded-md"
            style={{ background: ACCENT }}
          >
            <Zap size={14} className="text-[#0b1020]" />
          </span>
          <span className="text-sm font-semibold tracking-widest text-white">SOLVIX</span>
        </div>

        <h1 className="text-4xl font-medium leading-tight tracking-tight text-white">
          Create your <span className="font-serif italic" style={{ color: ACCENT }}>Solvix</span>{" "}
          account
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Join your operations, inventory, and engineering team.
        </p>

        <Tabs value={role} onValueChange={handleRoleChange} className="mt-6">
          <TabsList className="grid h-11 w-full grid-cols-2 rounded-xl border border-white/10 bg-white/[0.03] p-1">
            <TabsTrigger value="customer" className={tabCls}>
              <User size={14} /> Customer
            </TabsTrigger>
            <TabsTrigger value="employee" className={tabCls}>
              <Building2 size={14} /> Employee
            </TabsTrigger>
          </TabsList>

          {/* Transparent card: no solid fill, just a hairline border + blur */}
          <form
            onSubmit={handleSubmit}
            noValidate
            className="mt-4 space-y-4 rounded-2xl border border-white/10 bg-transparent p-6 backdrop-blur-md"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="text-sm font-semibold text-white">
                {role === "employee" ? "Employee Onboarding" : "Customer Registration"}
              </h2>
              <Link
                to="/signin"
                className="text-xs underline underline-offset-2 hover:opacity-80"
                style={{ color: ACCENT }}
              >
                Already have an account? Sign in
              </Link>
            </div>

            <Field label="Full name" error={errors.fullName} htmlFor="fullName">
              <Input
                id="fullName"
                value={form.fullName}
                onChange={set("fullName")}
                placeholder="Jane Doe"
                autoComplete="name"
                className={fieldCls}
              />
            </Field>

            <Field
              label={role === "employee" ? "Work email address" : "Email address"}
              error={errors.email}
              htmlFor="email"
            >
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={set("email")}
                placeholder={role === "employee" ? "name@solvix.example" : "you@example.com"}
                autoComplete="email"
                className={fieldCls}
              />
            </Field>

            <TabsContent value="customer" className="mt-0">
              <Field label="Phone (optional)" error={errors.phone} htmlFor="phone">
                <Input
                  id="phone"
                  type="tel"
                  value={form.phone}
                  onChange={set("phone")}
                  placeholder="+91 98765 43210"
                  autoComplete="tel"
                  className={fieldCls}
                />
              </Field>
            </TabsContent>

            <TabsContent value="employee" className="mt-0">
              <Field label="Department" htmlFor="department">
                <Select
                  value={form.department}
                  onValueChange={(v) => setForm((f) => ({ ...f, department: v }))}
                >
                  <SelectTrigger id="department" className={fieldCls}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-white/10 bg-[#0b1020] text-white">
                    {DEPARTMENTS.map((d) => (
                      <SelectItem key={d} value={d} className="focus:bg-white/10 focus:text-white">
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </TabsContent>

            <Field label="Password" error={errors.password} htmlFor="password">
              <PasswordInput
                id="password"
                value={form.password}
                onChange={set("password")}
                autoComplete="new-password"
              />
            </Field>

            <Field label="Confirm password" error={errors.confirm} htmlFor="confirm">
              <PasswordInput
                id="confirm"
                value={form.confirm}
                onChange={set("confirm")}
                autoComplete="new-password"
              />
            </Field>

            {serverMsg && (
              <p className="rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {serverMsg}
              </p>
            )}

            {/* The single button for both roles */}
            <Button
              type="submit"
              disabled={loading}
              className="h-11 w-full rounded-full text-sm font-semibold text-[#0b1020] hover:opacity-90"
              style={{ background: ACCENT }}
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : "Sign Up"}
            </Button>

            <p className="text-center text-xs leading-relaxed text-white/55">
              {role === "employee"
                ? "Employee registration is verified by Solvix Administrator. Access permissions are provisioned according to your department."
                : "By signing up you agree to Solvix's Terms and Privacy Policy."}
            </p>
          </form>
        </Tabs>
      </div>
    </section>
  );
}

/* ---- Wire it up -----------------------------------------------------------
// App.jsx
<Route path="/signup" element={<SignUpForm />} />

// Navbar: the one "Sign Up" button for everyone
<Link to="/signup" className="rounded-full border border-white/70 px-5 py-2 text-sm text-white">
  Sign Up
</Link>
--------------------------------------------------------------------------- */
