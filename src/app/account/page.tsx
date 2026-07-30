import Link from "next/link";
import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";

import { PageContainer } from "@/components/ui/page-container";
import { PageHeader } from "@/components/ui/page-header";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { bookingStatusLabel, formatMoney } from "@/lib/utils";

type AccountBooking = Prisma.BookingGetPayload<{
  include: { quote: true; invoice: true; pod: true };
}>;

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const customer = await prisma.customer.findFirst({
    where: { userId: session.id },
  });

  const bookings: AccountBooking[] = await prisma.booking.findMany({
    where: customer ? { customerId: customer.id } : { contactEmail: session.email },
    include: { quote: true, invoice: true, pod: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <PageContainer>
    <div>
      <PageHeader title="My bookings" subtitle={session.email} />

      <div className="nexus-card animate-fade-in-up overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b bg-gray-50/80">
              <tr>
                <th className="px-5 py-3 font-semibold text-gray-600">Reference</th>
                <th className="px-5 py-3 font-semibold text-gray-600">Status</th>
                <th className="px-5 py-3 font-semibold text-gray-600">Value</th>
                <th className="px-5 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking, i) => {
                const inputs = booking.quote.inputs as { originPostcode?: string; destinationPostcode?: string };
                return (
                  <tr
                    key={booking.id}
                    className="animate-fade-in border-b border-gray-50 transition-colors hover:bg-gray-50/50"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <td className="px-5 py-4">
                      <p className="font-semibold text-gray-900">{booking.reference}</p>
                      <p className="text-xs text-gray-500">
                        {inputs.originPostcode} → {inputs.destinationPostcode}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium">
                        {bookingStatusLabel(booking.status)}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-medium">{formatMoney(Number(booking.valueIncVat))}</td>
                    <td className="px-5 py-4 space-x-3">
                      {booking.invoice?.pdfUrl && (
                        <a
                          href={booking.invoice.pdfUrl}
                          download
                          className="text-sm font-medium underline"
                          style={{ color: "var(--brand-primary)" }}
                        >
                          Invoice
                        </a>
                      )}
                      {booking.pod && <span className="text-sm text-green-600">POD ✓</span>}
                      <Link href="/" className="text-sm text-gray-500 underline hover:text-gray-700">
                        Rebook
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {bookings.length === 0 && (
            <p className="py-12 text-center text-gray-500">No bookings yet. Get a quote to get started.</p>
          )}
        </div>
      </div>
    </div>
    </PageContainer>
  );
}
