import re
with open('src/worker.ts', 'r', encoding='utf-8') as f:
    c = f.read()

s1 = '''const issues = fallbackState.issues;'''
s2 = '''const issues = user?.role === 'DEPARTMENT_USER' ? fallbackState.issues.filter((i: any) => i.departmentId === user.departmentId) : fallbackState.issues;'''
c = c.replace(s1, s2)

s3 = '''const returns = fallbackState.returns;'''
s4 = '''const returns = user?.role === 'DEPARTMENT_USER' ? fallbackState.returns.filter((r: any) => r.departmentId === user.departmentId) : fallbackState.returns;'''
c = c.replace(s3, s4)

s5 = '''const issuesRes = await env.DB.prepare("SELECT * FROM StockIssueVoucher ORDER BY createdAt DESC LIMIT 5").all<any>();'''
s6 = '''const issuesRes = user?.role === 'DEPARTMENT_USER' ? await env.DB.prepare("SELECT * FROM StockIssueVoucher WHERE departmentId = ? ORDER BY createdAt DESC LIMIT 5").bind(user.departmentId).all<any>() : await env.DB.prepare("SELECT * FROM StockIssueVoucher ORDER BY createdAt DESC LIMIT 5").all<any>();'''
c = c.replace(s5, s6)

s7 = '''const returnsRes = await env.DB.prepare("SELECT * FROM ItemReturn ORDER BY createdAt DESC LIMIT 5").all<any>();'''
s8 = '''const returnsRes = user?.role === 'DEPARTMENT_USER' ? await env.DB.prepare("SELECT * FROM ItemReturn WHERE departmentId = ? ORDER BY createdAt DESC LIMIT 5").bind(user.departmentId).all<any>() : await env.DB.prepare("SELECT * FROM ItemReturn ORDER BY createdAt DESC LIMIT 5").all<any>();'''
c = c.replace(s7, s8)

s9 = '''const issues = await env.DB.prepare("SELECT * FROM StockIssueVoucher ORDER BY createdAt DESC").all<any>();'''
s10 = '''const issues = user?.role === 'DEPARTMENT_USER' ? await env.DB.prepare("SELECT * FROM StockIssueVoucher WHERE departmentId = ? ORDER BY createdAt DESC").bind(user.departmentId).all<any>() : await env.DB.prepare("SELECT * FROM StockIssueVoucher ORDER BY createdAt DESC").all<any>();'''
c = c.replace(s9, s10)

s11 = '''const rets = await env.DB.prepare("SELECT * FROM ItemReturn ORDER BY createdAt DESC").all<any>();'''
s12 = '''const rets = user?.role === 'DEPARTMENT_USER' ? await env.DB.prepare("SELECT * FROM ItemReturn WHERE departmentId = ? ORDER BY createdAt DESC").bind(user.departmentId).all<any>() : await env.DB.prepare("SELECT * FROM ItemReturn ORDER BY createdAt DESC").all<any>();'''
c = c.replace(s11, s12)

# For Dashboard items map
dashboard1 = '''const dashIssues = env.DB ? (issuesRes.results || []) : fallbackState.issues;'''
dashboard2 = '''let dashIssues = env.DB ? (issuesRes.results || []) : fallbackState.issues;
      if (user?.role === 'DEPARTMENT_USER' && !env.DB) dashIssues = dashIssues.filter((i: any) => i.departmentId === user.departmentId);'''
c = c.replace(dashboard1, dashboard2)

dashboard3 = '''const dashReturns = env.DB ? (returnsRes.results || []) : fallbackState.returns;'''
dashboard4 = '''let dashReturns = env.DB ? (returnsRes.results || []) : fallbackState.returns;
      if (user?.role === 'DEPARTMENT_USER' && !env.DB) dashReturns = dashReturns.filter((r: any) => r.departmentId === user.departmentId);'''
c = c.replace(dashboard3, dashboard4)

with open('src/worker.ts', 'w', encoding='utf-8') as f:
    f.write(c)
