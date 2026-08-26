import { FeaturePlaceholder } from "@/components/shared/feature-placeholder";
export default function EditOrderPage() {
  return (
    <FeaturePlaceholder
      title="Edit order"
      description="Submitted-order editing is intentionally restricted. This surface will allow safe corrections while preserving the audit history."
      items={[
        "Ownership check",
        "Editable-field allowlist",
        "Change history",
        "Submission cutoff",
      ]}
    />
  );
}
