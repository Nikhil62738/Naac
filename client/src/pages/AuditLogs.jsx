import React, { useEffect, useState } from "react";
import { api } from "../api/http";
import Layout from "../components/Layout";

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    api.get("/logs").then((res) => setLogs(res.data));
  }, []);

  return (
    <Layout>
      <section className="panel">
        <h2>Audit Trail</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Target</th><th>Details</th></tr></thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id}>
                  <td>{new Date(log.createdAt).toLocaleString()}</td>
                  <td>{log.actor?.name || "System"}<small>{log.actor?.email}</small></td>
                  <td>{log.action}</td>
                  <td>{log.target}</td>
                  <td>{log.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Layout>
  );
}
