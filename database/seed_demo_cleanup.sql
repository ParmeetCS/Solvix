-- Removes everything created by database/seed_demo_data.sql (rows whose code contains DEMO).
-- Real records are never touched. Run in the Supabase SQL Editor.

do $$ begin
  delete from activity_logs where metadata->>'demo' = 'true';
  delete from financial_transactions where transaction_code like 'TXN-DEMO-%';
  delete from subsidy_applications where application_code like 'SUB-DEMO-%';
  delete from project_costs where order_id in (select id from orders where order_code like 'ORD-DEMO-%');
  delete from expenses where expense_code like 'EXP-DEMO-%';
  delete from invoice_items where invoice_id in (select id from invoices where invoice_code like 'INV-DEMO-%');
  delete from invoices where invoice_code like 'INV-DEMO-%';
  delete from warranty_claims where claim_code like 'CLM-DEMO-%';
  delete from service_ticket_updates where ticket_id in (select id from service_tickets where ticket_code like 'TKT-DEMO-%');
  delete from service_tickets where ticket_code like 'TKT-DEMO-%';
  delete from warranties where warranty_code like 'WAR-DEMO-%';
  delete from technician_assignments where installation_id in (select id from installations where installation_code like 'INS-DEMO-%');
  delete from installation_tasks where installation_id in (select id from installations where installation_code like 'INS-DEMO-%');
  delete from installations where installation_code like 'INS-DEMO-%';
  delete from technicians where employee_code like 'TECH-DEMO-%';
  delete from equipment_deliveries where dispatch_id in (select id from dispatches where dispatch_code like 'DSP-DEMO-%');
  delete from dispatch_items where dispatch_id in (select id from dispatches where dispatch_code like 'DSP-DEMO-%');
  delete from dispatches where dispatch_code like 'DSP-DEMO-%';
  delete from equipment_serial_numbers where serial_number like 'SN-DEMO-%';
  delete from purchase_order_items where purchase_order_id in (select id from purchase_orders where po_code like 'PO-DEMO-%');
  delete from purchase_orders where po_code like 'PO-DEMO-%';
  delete from stock_movements where warehouse_id in (select id from warehouses where code like 'WH-DEMO-%');
  delete from inventory where warehouse_id in (select id from warehouses where code like 'WH-DEMO-%');
  delete from warehouses where code like 'WH-DEMO-%';
  delete from payments where payment_code like 'PAY-DEMO-%';
  delete from order_status_history where order_id in (select id from orders where order_code like 'ORD-DEMO-%');
  delete from orders where order_code like 'ORD-DEMO-%';
  delete from quotation_items where quotation_id in (select id from quotations where quotation_code like 'QTN-DEMO-%');
  delete from quotations where quotation_code like 'QTN-DEMO-%';
  delete from survey_reports where survey_id in (select id from site_surveys where survey_code like 'SRV-DEMO-%');
  delete from survey_approvals where survey_id in (select id from site_surveys where survey_code like 'SRV-DEMO-%');
  delete from survey_assignments where survey_id in (select id from site_surveys where survey_code like 'SRV-DEMO-%');
  delete from site_surveys where survey_code like 'SRV-DEMO-%';
  delete from customer_interactions where lead_id in (select id from leads where lead_code like 'LEAD-DEMO-%');
  delete from follow_ups where lead_id in (select id from leads where lead_code like 'LEAD-DEMO-%');
  delete from leads where lead_code like 'LEAD-DEMO-%';
  delete from customer_addresses where customer_id in (select id from customers where customer_code like 'CUST-DEMO-%');
  delete from customers where customer_code like 'CUST-DEMO-%';
exception when others then raise notice 'Cleanup stopped: %', sqlerrm; end $$;
