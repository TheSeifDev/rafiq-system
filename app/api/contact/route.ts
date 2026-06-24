import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { name, email, subject, message } = body;

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        {
          success: false,
          message: 'All fields are required.',
        },
        { status: 400 }
      );
    }

    if (!process.env.SMTP_USER) {
      throw new Error('SMTP_USER is missing.');
    }

    if (!process.env.SMTP_PASS) {
      throw new Error('SMTP_PASS is missing.');
    }

    if (!process.env.CONTACT_EMAIL) {
      throw new Error('CONTACT_EMAIL is missing.');
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',

      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.verify();

    await transporter.sendMail({
      from: `"${name}" <${process.env.SMTP_USER}>`,

      to: process.env.CONTACT_EMAIL,

      replyTo: email,

      subject: `New Contact: ${subject}`,

      html: `
    <!DOCTYPE html>
    <html>
      <body
        style="
          margin:0;
          padding:40px 20px;
          background:#07070A;
          font-family:Inter,Arial,sans-serif;
          color:#ffffff;
        "
      >
        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          border="0"
        >
          <tr>
            <td align="center">
              
              <table
                width="100%"
                cellpadding="0"
                cellspacing="0"
                border="0"
                style="
                  max-width:650px;
                  background:#0D0D12;
                  border:1px solid rgba(255,255,255,0.08);
                  border-radius:28px;
                  overflow:hidden;
                "
              >

                <tr>
                  <td
                    style="
                      padding:40px;
                      background:
                        radial-gradient(circle at top right,
                        rgba(255,59,59,0.22),
                        transparent 45%),
                        #0D0D12;
                      border-bottom:1px solid rgba(255,255,255,0.08);
                    "
                  >
                    <p
                      style="
                        margin:0;
                        color:#FF3B3B;
                        font-size:12px;
                        font-weight:700;
                        letter-spacing:0.25em;
                        text-transform:uppercase;
                      "
                    >
                      New Contact Message
                    </p>

                    <h1
                      style="
                        margin:16px 0 0;
                        font-size:34px;
                        line-height:1.1;
                        font-weight:900;
                        color:#ffffff;
                      "
                    >
                      ${subject}
                    </h1>

                    <p
                      style="
                        margin:18px 0 0;
                        color:rgba(255,255,255,0.6);
                        font-size:15px;
                        line-height:1.7;
                      "
                    >
                      A new inquiry has been submitted through the
                      Phantoms contact form.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="padding:40px">
                    
                    <table
                      width="100%"
                      cellpadding="0"
                      cellspacing="0"
                      border="0"
                    >
                      <tr>
                        <td
                          style="
                            padding:18px 22px;
                            background:#12121A;
                            border:1px solid rgba(255,255,255,0.06);
                            border-radius:18px;
                          "
                        >
                          <p
                            style="
                              margin:0 0 8px;
                              font-size:11px;
                              letter-spacing:0.2em;
                              text-transform:uppercase;
                              color:rgba(255,255,255,0.4);
                              font-weight:700;
                            "
                          >
                            Full Name
                          </p>

                          <p
                            style="
                              margin:0;
                              font-size:16px;
                              font-weight:600;
                              color:#ffffff;
                            "
                          >
                            ${name}
                          </p>
                        </td>
                      </tr>

                      <tr><td height="14"></td></tr>

                      <tr>
                        <td
                          style="
                            padding:18px 22px;
                            background:#12121A;
                            border:1px solid rgba(255,255,255,0.06);
                            border-radius:18px;
                          "
                        >
                          <p
                            style="
                              margin:0 0 8px;
                              font-size:11px;
                              letter-spacing:0.2em;
                              text-transform:uppercase;
                              color:rgba(255,255,255,0.4);
                              font-weight:700;
                            "
                          >
                            Email Address
                          </p>

                          <p
                            style="
                              margin:0;
                              font-size:16px;
                              font-weight:600;
                              color:#ffffff;
                            "
                          >
                            ${email}
                          </p>
                        </td>
                      </tr>

                      <tr><td height="14"></td></tr>

                      <tr>
                        <td
                          style="
                            padding:24px;
                            background:#12121A;
                            border:1px solid rgba(255,255,255,0.06);
                            border-radius:22px;
                          "
                        >
                          <p
                            style="
                              margin:0 0 12px;
                              font-size:11px;
                              letter-spacing:0.2em;
                              text-transform:uppercase;
                              color:rgba(255,255,255,0.4);
                              font-weight:700;
                            "
                          >
                            Message
                          </p>

                          <p
                            style="
                              margin:0;
                              color:rgba(255,255,255,0.78);
                              font-size:15px;
                              line-height:1.9;
                            "
                          >
                            ${message}
                          </p>
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>

                <tr>
                  <td
                    style="
                      padding:28px 40px;
                      border-top:1px solid rgba(255,255,255,0.08);
                      background:#0A0A0F;
                    "
                  >
                    <p
                      style="
                        margin:0;
                        font-size:13px;
                        color:rgba(255,255,255,0.35);
                        text-align:center;
                        line-height:1.7;
                      "
                    >
                      Sent from Phantoms Website Contact System
                    </p>
                  </td>
                </tr>

              </table>

            </td>
          </tr>
        </table>
      </body>
    </html>
  `,
    });

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully.',
    });
  } catch (error) {
    console.error('EMAIL ERROR:', error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Failed to send message.',
      },
      { status: 500 }
    );
  }
}