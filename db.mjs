// Database adapter for LexVora.
// The app uses this repository interface everywhere, so swapping from the
// in-memory demo store to PostgreSQL does not require changing route logic.

const seedLawyers = [
  {
    id: "lawyer-1",
    name: "Adv. Riya Sharma",
    phone: "9876543210",
    email: "riya.sharma@example.com",
    specialization: "Family Law",
    city: "Delhi",
    court: "Delhi High Court",
    experience: "8 years",
    mode: "Phone and In-person",
    summary: "Handles family mediation, divorce, maintenance, and custody matters.",
  },
  {
    id: "lawyer-2",
    name: "Adv. Arjun Mehta",
    phone: "9988776655",
    email: "arjun.mehta@example.com",
    specialization: "Criminal Law",
    city: "Mumbai",
    court: "Bombay High Court",
    experience: "11 years",
    mode: "Phone",
    summary: "Supports bail, FIR, criminal defence, and urgent legal consultations.",
  },
  {
    id: "lawyer-3",
    name: "Adv. Kavya Rao",
    phone: "9123456780",
    email: "kavya.rao@example.com",
    specialization: "Property Law",
    city: "Bengaluru",
    court: "City Civil Court Bengaluru",
    experience: "7 years",
    mode: "Video Call",
    summary: "Works on property documentation, sale deed review, and ownership disputes.",
  },
];

export function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function lawyerMatches(lawyer, filters) {
  const specializationMatch =
    !filters.specialization || lawyer.specialization === filters.specialization;
  const cityMatch =
    !filters.city || lawyer.city.toLowerCase().includes(filters.city.toLowerCase());
  const courtMatch =
    !filters.court || lawyer.court.toLowerCase().includes(filters.court.toLowerCase());

  return specializationMatch && cityMatch && courtMatch;
}

function publicLawyer(lawyer) {
  return {
    id: lawyer.id,
    name: lawyer.name,
    specialization: lawyer.specialization,
    city: lawyer.city,
    court: lawyer.court,
    experience: lawyer.experience,
    mode: lawyer.mode,
    summary: lawyer.summary,
  };
}

class MemoryRepository {
  constructor() {
    // Local/dev fallback only. Production should use Postgres so data survives deploys.
    this.lawyers = [...seedLawyers];
    this.consultationRequests = [];
  }

  async health() {
    return { client: "memory", connected: true };
  }

  async listLawyers() {
    return this.lawyers;
  }

  async createLawyer(input) {
    const lawyer = {
      id: createId("lawyer"),
      ...input,
    };
    this.lawyers.push(lawyer);
    return lawyer;
  }

  async searchLawyers(filters) {
    return this.lawyers.filter((lawyer) => lawyerMatches(lawyer, filters)).map(publicLawyer);
  }

  async listRequests() {
    return this.consultationRequests;
  }

  async createConsultationRequests({ lawyerIds, enquiry, payment }) {
    const selectedLawyers = this.lawyers.filter((lawyer) => lawyerIds?.includes(lawyer.id));
    const createdAt = new Date();
    const createdRequests = selectedLawyers.map((lawyer) => ({
      id: createId("request"),
      lawyerId: lawyer.id,
      lawyerName: lawyer.name,
      lawyerPhone: lawyer.phone,
      customerName: enquiry.customerName,
      customerPhone: enquiry.customerPhone,
      customerEmail: enquiry.customerEmail,
      legalIssue: enquiry.legalIssue,
      gateway: payment.gateway,
      paymentOption: payment.paymentOption,
      paymentReference: payment.paymentReference,
      fee: 99,
      status: "Pending",
      createdAt: createdAt.toISOString(),
      refundDeadline: "48 working hours",
      adminNote: "Awaiting admin approval. Refund applies if rejected or not approved in 48 working hours.",
    }));

    this.consultationRequests = [...this.consultationRequests, ...createdRequests];
    return createdRequests;
  }

  async updateRequestStatus(requestId, status, adminNote, extras = {}) {
    const request = this.consultationRequests.find((item) => item.id === requestId);
    if (!request) return null;

    Object.assign(request, extras, { status, adminNote });
    return request;
  }
}

class PostgresRepository {
  constructor(pool) {
    this.pool = pool;
  }

  async health() {
    await this.pool.query("select 1");
    return { client: "postgres", connected: true };
  }

  async listLawyers() {
    const result = await this.pool.query(
      `select id, name, phone, email, specialization, city, court, experience, mode, summary
       from lawyers
       order by created_at desc`
    );
    return result.rows;
  }

  async createLawyer(input) {
    const id = createId("lawyer");
    const result = await this.pool.query(
      `insert into lawyers
       (id, name, phone, email, specialization, city, court, experience, mode, summary)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       returning id, name, phone, email, specialization, city, court, experience, mode, summary`,
      [
        id,
        input.name,
        input.phone,
        input.email,
        input.specialization,
        input.city,
        input.court,
        input.experience,
        input.mode,
        input.summary,
      ]
    );
    return result.rows[0];
  }

  async searchLawyers(filters) {
    const result = await this.pool.query(
      `select id, name, specialization, city, court, experience, mode, summary
       from lawyers
       where ($1::text = '' or specialization = $1)
         and ($2::text = '' or city ilike '%' || $2 || '%')
         and ($3::text = '' or court ilike '%' || $3 || '%')
       order by created_at desc`,
      [filters.specialization || "", filters.city || "", filters.court || ""]
    );
    return result.rows;
  }

  async listRequests() {
    const result = await this.pool.query(
      `select
         id,
         lawyer_id as "lawyerId",
         lawyer_name as "lawyerName",
         lawyer_phone as "lawyerPhone",
         customer_name as "customerName",
         customer_phone as "customerPhone",
         customer_email as "customerEmail",
         legal_issue as "legalIssue",
         gateway,
         payment_option as "paymentOption",
         payment_reference as "paymentReference",
         fee,
         status,
         created_at as "createdAt",
         refund_deadline as "refundDeadline",
         admin_note as "adminNote",
         sms_status as "smsStatus",
         refund_status as "refundStatus"
       from consultation_requests
       order by created_at desc`
    );
    return result.rows;
  }

  async createConsultationRequests({ lawyerIds, enquiry, payment }) {
    const client = await this.pool.connect();

    try {
      await client.query("begin");
      const lawyersResult = await client.query(
        `select id, name, phone from lawyers where id = any($1::text[])`,
        [lawyerIds || []]
      );
      const created = [];

      for (const lawyer of lawyersResult.rows) {
        const id = createId("request");
        const result = await client.query(
          `insert into consultation_requests
           (
             id, lawyer_id, lawyer_name, lawyer_phone, customer_name, customer_phone,
             customer_email, legal_issue, gateway, payment_option, payment_reference,
             fee, status, refund_deadline, admin_note
           )
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 99, 'Pending', '48 working hours', $12)
           returning
             id,
             lawyer_id as "lawyerId",
             lawyer_name as "lawyerName",
             lawyer_phone as "lawyerPhone",
             customer_name as "customerName",
             customer_phone as "customerPhone",
             customer_email as "customerEmail",
             legal_issue as "legalIssue",
             gateway,
             payment_option as "paymentOption",
             payment_reference as "paymentReference",
             fee,
             status,
             created_at as "createdAt",
             refund_deadline as "refundDeadline",
             admin_note as "adminNote"`,
          [
            id,
            lawyer.id,
            lawyer.name,
            lawyer.phone,
            enquiry.customerName,
            enquiry.customerPhone,
            enquiry.customerEmail,
            enquiry.legalIssue,
            payment.gateway,
            payment.paymentOption,
            payment.paymentReference,
            "Awaiting admin approval. Refund applies if rejected or not approved in 48 working hours.",
          ]
        );
        created.push(result.rows[0]);
      }

      await client.query("commit");
      return created;
    } catch (error) {
      await client.query("rollback");
      throw error;
    } finally {
      client.release();
    }
  }

  async updateRequestStatus(requestId, status, adminNote, extras = {}) {
    const result = await this.pool.query(
      `update consultation_requests
       set status = $2,
           admin_note = $3,
           sms_status = coalesce($4, sms_status),
           refund_status = coalesce($5, refund_status),
           updated_at = now()
       where id = $1
       returning
         id,
         lawyer_id as "lawyerId",
         lawyer_name as "lawyerName",
         lawyer_phone as "lawyerPhone",
         customer_name as "customerName",
         customer_phone as "customerPhone",
         customer_email as "customerEmail",
         legal_issue as "legalIssue",
         gateway,
         payment_option as "paymentOption",
         payment_reference as "paymentReference",
         fee,
         status,
         created_at as "createdAt",
         refund_deadline as "refundDeadline",
         admin_note as "adminNote",
         sms_status as "smsStatus",
         refund_status as "refundStatus"`,
      [requestId, status, adminNote, extras.smsStatus || null, extras.refundStatus || null]
    );
    return result.rows[0] || null;
  }
}

export async function createRepository(config) {
  if (config.dbClient !== "postgres") {
    return new MemoryRepository();
  }

  // `pg` is only loaded when DB_CLIENT=postgres, so local memory mode has no DB dependency.
  const { Pool } = await import("pg");
  const pool = new Pool({
    connectionString: config.databaseUrl,
    ssl: config.dbSsl ? { rejectUnauthorized: false } : undefined,
    max: config.dbPoolMax,
  });

  return new PostgresRepository(pool);
}
