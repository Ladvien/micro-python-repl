test_var = 0
try:
    test_var = 1+1
    try:
        def fun_func():
            print('fun')
        1/0
    except:
        try:
            1/0
        except:
            try:
                1/0
            except:
                print('hello')
except:
    test_var = '3+3'
fun_func()